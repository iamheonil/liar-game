package com.liargame.application.service;

import com.liargame.application.view.ChatView;
import com.liargame.application.view.GameResultView;
import com.liargame.application.view.GameView;
import com.liargame.application.view.HintView;
import com.liargame.application.view.PlayerView;
import com.liargame.application.view.RankView;
import com.liargame.application.view.RoomSummaryView;
import com.liargame.application.view.RoomView;
import com.liargame.application.view.RoundResultView;
import com.liargame.application.view.SecretView;
import com.liargame.domain.game.Game;
import com.liargame.domain.game.GamePhase;
import com.liargame.domain.game.GameRules;
import com.liargame.domain.game.Round;
import com.liargame.domain.game.RoundOutcome;
import com.liargame.domain.player.Player;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.ChatMessage;
import com.liargame.domain.room.Room;
import com.liargame.domain.room.RoomSettings;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * 도메인 객체를 클라이언트가 받을 뷰로 변환함.
 *
 * <p>이 클래스의 유일한 책임은 "무엇을 보여 주고 무엇을 감출지"임. 라이어 정체와 제시어가 실수로
 * 공개 상태에 섞이지 않도록 노출 경로를 여기 한 곳으로 모음.
 */
@Component
public class RoomViewAssembler {

    public RoomView toRoomView(Room room, Instant now) {
        Game game = room.game().orElse(null);
        return new RoomView(
                room.id().value(),
                room.title(),
                room.status().name(),
                room.hostId().value(),
                room.settings().totalRounds(),
                RoomSettings.ALLOWED_ROUNDS,
                GameRules.MIN_PLAYERS,
                GameRules.MAX_PLAYERS,
                toPlayerViews(room, game),
                game == null ? null : toGameView(room, game),
                now.toEpochMilli());
    }

    public RoomSummaryView toSummary(Room room) {
        return new RoomSummaryView(
                room.id().value(),
                room.title(),
                room.find(room.hostId()).map(p -> p.nickname().value()).orElse("?"),
                room.playerCount(),
                GameRules.MAX_PLAYERS,
                room.status().name(),
                room.settings().totalRounds(),
                room.isJoinable());
    }

    public ChatView toChatView(ChatMessage message) {
        return new ChatView(
                message.id(),
                message.kind().name(),
                message.authorId() == null ? null : message.authorId().value(),
                message.authorName(),
                message.text(),
                message.at().toEpochMilli());
    }

    /** 해당 플레이어에게만 보내는 제시어. 라이어에게는 같은 범주의 다른 단어가 담김. */
    public SecretView toSecretView(Game game, PlayerId viewer) {
        Round round = game.round();
        return new SecretView(
                round.number(),
                round.words().category(),
                round.wordFor(viewer),
                round.turnOrder().stream().map(PlayerId::value).toList());
    }

    private List<PlayerView> toPlayerViews(Room room, Game game) {
        return room.players().stream()
                .map(player -> new PlayerView(
                        player.id().value(),
                        player.nickname().value(),
                        player.isConnected(),
                        room.isHost(player.id()),
                        game == null ? 0 : game.scoreBoard().scoreOf(player.id()),
                        game != null && game.hasAbandoned(player.id())))
                .toList();
    }

    private GameView toGameView(Room room, Game game) {
        Round round = game.round();
        GamePhase phase = game.phase();
        boolean revealed = phase == GamePhase.ROUND_RESULT || phase == GamePhase.GAME_RESULT;

        return new GameView(
                phase.name(),
                round.number(),
                game.totalRounds(),
                game.phaseEndsAt() == null ? null : game.phaseEndsAt().toEpochMilli(),
                round.turnOrder().stream().map(PlayerId::value).toList(),
                round.currentTurnPlayer().map(PlayerId::value).orElse(null),
                toHintViews(round),
                idKeyedMap(round.accusation().asMap(), PlayerId::value),
                idKeyedMap(round.survival().asMap(), Function.identity()),
                round.accusedId() == null ? null : round.accusedId().value(),
                round.skipRequests().stream().map(PlayerId::value).toList(),
                game.skipThreshold(),
                revealed ? lastOutcomeView(game) : null,
                phase == GamePhase.GAME_RESULT ? toGameResultView(room, game) : null);
    }

    private List<HintView> toHintViews(Round round) {
        return round.hints().stream()
                .map(hint -> new HintView(
                        hint.order(), hint.playerId().value(), hint.text(), hint.passed()))
                .toList();
    }

    private <T, R> Map<String, R> idKeyedMap(Map<PlayerId, T> source, Function<T, R> valueMapper) {
        return source.entrySet().stream()
                .collect(Collectors.toMap(
                        entry -> entry.getKey().value(), entry -> valueMapper.apply(entry.getValue())));
    }

    private RoundResultView lastOutcomeView(Game game) {
        List<RoundOutcome> history = game.history();
        return history.isEmpty() ? null : toOutcomeView(history.get(history.size() - 1));
    }

    private RoundResultView toOutcomeView(RoundOutcome outcome) {
        return new RoundResultView(
                outcome.roundNumber(),
                outcome.category(),
                outcome.citizenWord(),
                outcome.liarWord(),
                outcome.liarId().value(),
                outcome.accusedId() == null ? null : outcome.accusedId().value(),
                outcome.liarCaught(),
                outcome.liarGuess(),
                outcome.liarGuessCorrect(),
                outcome.ending().name(),
                outcome.winner().name(),
                idKeyedMap(outcome.awardedPoints(), Function.identity()));
    }

    private GameResultView toGameResultView(Room room, Game game) {
        return new GameResultView(
                toRanking(room, game),
                game.history().stream().map(this::toOutcomeView).toList());
    }

    /** 점수 내림차순 순위. 동점자에게는 같은 등수를 주고 그다음 등수를 건너뜀. */
    private List<RankView> toRanking(Room room, Game game) {
        List<RankView> ranking = new ArrayList<>();
        int position = 0;
        int previousScore = Integer.MIN_VALUE;
        int rank = 0;
        for (PlayerId id : game.scoreBoard().ranking()) {
            position++;
            int score = game.scoreBoard().scoreOf(id);
            if (score != previousScore) {
                rank = position;
                previousScore = score;
            }
            String nickname = room.find(id).map(Player::nickname).map(Object::toString).orElse("?");
            ranking.add(new RankView(rank, id.value(), nickname, score));
        }
        return ranking;
    }

}
