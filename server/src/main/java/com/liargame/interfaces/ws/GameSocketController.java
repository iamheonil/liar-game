package com.liargame.interfaces.ws;

import com.liargame.application.service.GameFlowService;
import com.liargame.application.service.RoomBroadcaster;
import com.liargame.application.service.RoomService;
import com.liargame.domain.RuleViolationException;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.RoomId;
import com.liargame.interfaces.dto.SocketCommands;
import java.security.Principal;
import java.util.function.BiConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * 게임 중 일어나는 모든 행동의 WebSocket 진입점.
 *
 * <p>행동 주체는 요청 본문이 아니라 접속 주체({@link Principal})에서 가져옴. 그래야 남의 이름으로
 * 투표하거나 발언하는 것이 원천적으로 불가능함.
 *
 * <p>규칙 위반은 게임을 중단시킬 사유가 아니라 요청자 한 명에게 알려 줄 안내이므로, 여기서 잡아
 * 개인 채널로 되돌려 줌.
 */
@Controller
public class GameSocketController {

    private static final Logger log = LoggerFactory.getLogger(GameSocketController.class);

    private final GameFlowService gameFlow;
    private final RoomService roomService;
    private final RoomBroadcaster broadcaster;

    public GameSocketController(
            GameFlowService gameFlow, RoomService roomService, RoomBroadcaster broadcaster) {
        this.gameFlow = gameFlow;
        this.roomService = roomService;
        this.broadcaster = broadcaster;
    }

    @MessageMapping("/room/{roomId}/sync")
    public void sync(@DestinationVariable String roomId, Principal principal) {
        execute(roomId, principal, gameFlow::resync);
    }

    @MessageMapping("/room/{roomId}/chat")
    public void chat(
            @DestinationVariable String roomId,
            @Payload SocketCommands.Chat command,
            Principal principal) {
        execute(roomId, principal, (room, player) -> gameFlow.chat(room, player, command.text()));
    }

    @MessageMapping("/room/{roomId}/hint")
    public void hint(
            @DestinationVariable String roomId,
            @Payload SocketCommands.Hint command,
            Principal principal) {
        execute(roomId, principal,
                (room, player) -> gameFlow.submitHint(room, player, command.text()));
    }

    @MessageMapping("/room/{roomId}/vote")
    public void vote(
            @DestinationVariable String roomId,
            @Payload SocketCommands.Vote command,
            Principal principal) {
        execute(roomId, principal,
                (room, player) -> gameFlow.castVote(room, player, command.targetId()));
    }

    @MessageMapping("/room/{roomId}/final-vote")
    public void finalVote(
            @DestinationVariable String roomId,
            @Payload SocketCommands.FinalVote command,
            Principal principal) {
        execute(roomId, principal,
                (room, player) -> gameFlow.castFinalVote(room, player, command.approve()));
    }

    @MessageMapping("/room/{roomId}/guess")
    public void guess(
            @DestinationVariable String roomId,
            @Payload SocketCommands.Guess command,
            Principal principal) {
        execute(roomId, principal,
                (room, player) -> gameFlow.submitGuess(room, player, command.word()));
    }

    @MessageMapping("/room/{roomId}/start")
    public void start(@DestinationVariable String roomId, Principal principal) {
        execute(roomId, principal, gameFlow::startGame);
    }

    @MessageMapping("/room/{roomId}/settings")
    public void settings(
            @DestinationVariable String roomId,
            @Payload SocketCommands.Settings command,
            Principal principal) {
        execute(roomId, principal,
                (room, player) -> roomService.changeSettings(room, player, command.totalRounds()));
    }

    @MessageMapping("/room/{roomId}/return-to-lobby")
    public void returnToLobby(@DestinationVariable String roomId, Principal principal) {
        execute(roomId, principal, gameFlow::returnToLobby);
    }

    private void execute(String roomId, Principal principal, BiConsumer<RoomId, PlayerId> action) {
        PlayerId playerId = PlayerId.of(principal.getName());
        try {
            action.accept(RoomId.of(roomId), playerId);
        } catch (RuleViolationException e) {
            broadcaster.error(playerId, e.getMessage());
        } catch (RuntimeException e) {
            log.error("소켓 명령 처리 실패 roomId={} playerId={}", roomId, playerId, e);
            broadcaster.error(playerId, "일시적인 오류가 발생했습니다");
        }
    }
}
