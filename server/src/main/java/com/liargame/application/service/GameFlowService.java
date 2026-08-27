package com.liargame.application.service;

import com.liargame.application.port.DelayedExecutor;
import com.liargame.domain.RuleViolationException;
import com.liargame.domain.game.Game;
import com.liargame.domain.game.GamePhase;
import com.liargame.domain.game.GameRules;
import com.liargame.domain.game.RoundRandomizer;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.ChatMessage;
import com.liargame.domain.room.Room;
import com.liargame.domain.room.RoomId;
import com.liargame.domain.room.RoomStatus;
import com.liargame.domain.word.WordPairProvider;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;

/**
 * 게임 진행 전반을 다룸.
 *
 * <p>도메인이 규칙을 판단하고, 이 서비스는 그 결과를 바깥 세계에 반영함. 구체적으로는 세 가지다.
 *
 * <ol>
 *   <li>다음 단계의 제한 시간 예약
 *   <li>새 라운드가 시작됐다면 각자에게 제시어 전달
 *   <li>바뀐 상태를 방 전체에 전파
 * </ol>
 *
 * <p>이 세 가지는 어떤 경로로 상태가 바뀌든 똑같이 필요하므로 {@code afterMutation} 한 곳으로
 * 모아 두고 모든 진입점이 그것을 거치게 함.
 */
@Service
public class GameFlowService {

    /** 게임 결과 화면을 자동으로 닫고 대기실로 돌아가기까지의 시간. */
    private static final Duration RESULT_LINGER = Duration.ofSeconds(60);

    private static final Set<String> SKIP_COMMANDS = Set.of("/스킵", "/skip");

    private final RoomService roomService;
    private final RoomLockRegistry locks;
    private final RoomBroadcaster broadcaster;
    private final DelayedExecutor delayed;
    private final GameRules rules;
    private final WordPairProvider wordPairProvider;
    private final RoundRandomizer randomizer;
    private final Clock clock;

    public GameFlowService(
            RoomService roomService,
            RoomLockRegistry locks,
            RoomBroadcaster broadcaster,
            DelayedExecutor delayed,
            GameRules rules,
            WordPairProvider wordPairProvider,
            RoundRandomizer randomizer,
            Clock clock) {
        this.roomService = roomService;
        this.locks = locks;
        this.broadcaster = broadcaster;
        this.delayed = delayed;
        this.rules = rules;
        this.wordPairProvider = wordPairProvider;
        this.randomizer = randomizer;
        this.clock = clock;
    }

    public void startGame(RoomId roomId, PlayerId requester) {
        mutate(roomId, room -> {
            room.startGame(requester, rules, wordPairProvider, randomizer, clock.instant());
            announce(room, "게임을 시작합니다. 총 %d라운드".formatted(room.settings().totalRounds()));
        });
    }

    public void submitHint(RoomId roomId, PlayerId speaker, String text) {
        mutate(roomId, room -> requireGame(room).submitHint(speaker, text, clock.instant()));
    }

    public void castVote(RoomId roomId, PlayerId voter, String targetId) {
        mutate(roomId, room ->
                requireGame(room).castVote(voter, PlayerId.of(targetId), clock.instant()));
    }

    public void castFinalVote(RoomId roomId, PlayerId voter, boolean approveExecution) {
        mutate(roomId, room ->
                requireGame(room).castFinalVote(voter, approveExecution, clock.instant()));
    }

    public void submitGuess(RoomId roomId, PlayerId guesser, String guess) {
        mutate(roomId, room -> requireGame(room).submitGuess(guesser, guess, clock.instant()));
    }

    /**
     * 채팅 입력 처리.
     *
     * <p>{@code /스킵} 은 대화가 아니라 명령이므로 여기서 가로채 토론 조기 종료 요청으로 바꿈.
     */
    public void chat(RoomId roomId, PlayerId speaker, String text) {
        String trimmed = text == null ? "" : text.trim();
        if (SKIP_COMMANDS.contains(trimmed.toLowerCase())) {
            requestSkip(roomId, speaker);
            return;
        }
        mutate(roomId, room -> {
            ChatMessage message = room.speak(speaker, trimmed, clock.instant());
            broadcaster.chat(room, message);
        });
    }

    private void requestSkip(RoomId roomId, PlayerId requester) {
        mutate(roomId, room -> {
            Game game = requireGame(room);
            int agreed = game.requestSkip(requester, clock.instant());
            String nickname = room.find(requester).orElseThrow().nickname().value();
            announce(room, "%s 님이 토론 건너뛰기에 동의했습니다 (%d/%d)"
                    .formatted(nickname, agreed, game.skipThreshold()));
        });
    }

    public void returnToLobby(RoomId roomId, PlayerId requester) {
        mutate(roomId, room -> {
            if (!room.isHost(requester)) {
                throw new RuleViolationException("방장만 할 수 있는 동작임");
            }
            if (room.status() == RoomStatus.PLAYING) {
                throw new RuleViolationException("게임이 진행 중임");
            }
            room.returnToLobby();
        });
    }

    /**
     * 예약해 둔 단계 제한 시간이 만료됐을 때 호출됨.
     *
     * <p>전원이 일찍 투표를 마치는 등으로 단계가 이미 넘어갔다면 이 예약은 의미가 없음. 예약 당시의
     * 토큰과 현재 토큰을 비교해 그런 경우를 걸러냄.
     */
    public void onPhaseTimeout(RoomId roomId, long expectedToken) {
        withRoom(roomId, room -> {
            Game game = room.game().orElse(null);
            if (game == null || game.phaseToken() != expectedToken) {
                return;
            }
            applyAndSync(room, () -> game.onTimeout(clock.instant()));
        });
    }

    /** 결과 화면을 충분히 본 뒤 자동으로 대기실로 되돌림. */
    public void onResultLingerExpired(RoomId roomId) {
        withRoom(roomId, room -> {
            if (room.status() == RoomStatus.RESULT) {
                applyAndSync(room, room::returnToLobby);
            }
        });
    }

    /**
     * 재접속 유예까지 지나 이탈이 확정된 플레이어를 처리함.
     *
     * <p>게임 중이면 참가자 명단에는 남겨 두고 게임에서만 제외함. 점수판과 결과 화면에 그 사람이
     * 무슨 일을 했는지가 남아 있어야 하기 때문임. 대기실이나 결과 화면이면 명단에서 지움.
     */
    public void abandon(RoomId roomId, PlayerId leaver) {
        withRoom(roomId, room -> {
            applyAndSync(room, () -> {
                if (room.status() == RoomStatus.PLAYING) {
                    room.find(leaver).ifPresent(player -> announce(
                            room,
                            "%s 님의 연결이 끊겨 이번 게임에서 제외됩니다"
                                    .formatted(player.nickname().value())));
                    room.game().orElseThrow().abandon(leaver, clock.instant());
                } else {
                    roomService.purge(room, leaver);
                }
            });
            if (room.hasNoConnectedPlayer()) {
                broadcaster.closed(roomId, "남은 참가자가 없어 방이 닫혔습니다");
                roomService.deleteRoom(roomId);
            }
        });
    }

    /** 입장·재접속 직후 지금 상태를 처음부터 다시 내려 줌. */
    public void resync(RoomId roomId, PlayerId viewer) {
        withRoom(roomId, room -> {
            broadcaster.state(room);
            broadcaster.chatHistory(room, viewer);
            room.game()
                    .filter(game -> !game.isFinished() && !game.hasAbandoned(viewer))
                    .ifPresent(game -> broadcaster.secret(game, viewer));
        });
    }

    // ------------------------------------------------------------------ 내부

    /** 사용자 요청 경로. 방이 없으면 요청자에게 사유가 전달되도록 예외를 그대로 올림. */
    private void mutate(RoomId roomId, Consumer<Room> action) {
        locks.run(roomId, () -> {
            Room room = roomService.require(roomId);
            applyAndSync(room, () -> action.accept(room));
        });
    }

    /**
     * 타이머·접속 이벤트 경로.
     *
     * <p>예약이 발화하기 직전에 방이 사라졌을 수 있는데, 그건 오류가 아니라 정상적인 경합이므로
     * 조용히 넘어감.
     */
    private void withRoom(RoomId roomId, Consumer<Room> action) {
        locks.run(roomId, () -> roomService.find(roomId).ifPresent(action));
    }

    /**
     * 상태를 바꾸고 그 결과를 바깥에 반영하는 공통 절차.
     *
     * <p>변경 전후의 단계 토큰을 비교해 새 라운드가 시작됐는지 판단함. 라운드 시작은 단계가
     * {@code ROLE_REVEAL} 로 바뀌는 순간과 정확히 일치하므로 이 시점에만 제시어를 내려보냄.
     */
    private void applyAndSync(Room room, Runnable mutation) {
        long tokenBefore = room.game().map(Game::phaseToken).orElse(-1L);
        RoomStatus statusBefore = room.status();

        mutation.run();

        Game game = room.game().orElse(null);
        if (game != null
                && game.phaseToken() != tokenBefore
                && game.phase() == GamePhase.ROLE_REVEAL) {
            broadcaster.secrets(room);
        }
        schedulePhaseDeadline(room, game);
        broadcaster.state(room);

        if (statusBefore != room.status()) {
            broadcaster.lobby();
        }
    }

    private void schedulePhaseDeadline(Room room, Game game) {
        String phaseKey = phaseKey(room.id());
        String lingerKey = lingerKey(room.id());
        if (game == null) {
            delayed.cancel(phaseKey);
            delayed.cancel(lingerKey);
            return;
        }
        if (game.isFinished()) {
            delayed.cancel(phaseKey);
            delayed.schedule(
                    lingerKey,
                    clock.instant().plus(RESULT_LINGER),
                    () -> onResultLingerExpired(room.id()));
            return;
        }
        long token = game.phaseToken();
        delayed.schedule(phaseKey, game.phaseEndsAt(), () -> onPhaseTimeout(room.id(), token));
    }

    private void announce(Room room, String text) {
        broadcaster.chat(room, room.announce(text, clock.instant()));
    }

    private Game requireGame(Room room) {
        return room.game().orElseThrow(() -> new RuleViolationException("진행 중인 게임이 없음"));
    }

    private static String phaseKey(RoomId roomId) {
        return "phase:" + roomId.value();
    }

    private static String lingerKey(RoomId roomId) {
        return "linger:" + roomId.value();
    }
}
