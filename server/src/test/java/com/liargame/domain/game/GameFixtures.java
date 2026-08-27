package com.liargame.domain.game;

import com.liargame.domain.player.PlayerId;
import com.liargame.domain.word.Word;
import com.liargame.domain.word.WordPair;
import com.liargame.domain.word.WordPairProvider;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.stream.IntStream;

/**
 * 게임 규칙 테스트에 쓰는 결정적 재료.
 *
 * <p>무작위성과 시각을 모두 고정하면 상태 전이를 실시간 대기 없이 정확히 검증할 수 있음.
 */
public final class GameFixtures {

    public static final Instant T0 = Instant.parse("2026-01-01T00:00:00Z");
    public static final String CITIZEN_WORD = "호랑이";
    public static final String LIAR_WORD = "사자";

    private GameFixtures() {
    }

    public static List<PlayerId> players(int count) {
        return IntStream.range(0, count)
                .mapToObj(index -> PlayerId.of("player-" + index))
                .toList();
    }

    /** 라운드마다 같은 사람을 라이어로 지목하고 발언 순서는 참가 순서 그대로 두는 배정기. */
    public static RoundRandomizer liarAt(int index) {
        return new RoundRandomizer() {
            @Override
            public PlayerId pickLiar(List<PlayerId> candidates) {
                return candidates.get(Math.min(index, candidates.size() - 1));
            }

            @Override
            public List<PlayerId> shuffleTurnOrder(List<PlayerId> candidates) {
                return candidates;
            }
        };
    }

    public static WordPairProvider fixedWords() {
        return () -> new WordPair(
                new Word("동물", CITIZEN_WORD), new Word("동물", LIAR_WORD));
    }

    public static GameRules rules() {
        return GameRules.defaults();
    }

    public static Game start(int playerCount, int liarIndex, int totalRounds) {
        return Game.start(
                players(playerCount),
                totalRounds,
                rules(),
                fixedWords(),
                liarAt(liarIndex),
                T0);
    }

    /** 제한 시간이 다 된 것으로 보고 다음 단계로 넘김. */
    public static void timeout(Game game) {
        game.onTimeout(game.phaseEndsAt() == null ? T0 : game.phaseEndsAt().plus(Duration.ZERO));
    }

    /** 힌트 단계를 시작해 전원이 순서대로 힌트를 제출한 상태로 만듦. */
    public static void completeHints(Game game) {
        timeout(game);
        while (game.phase() == GamePhase.HINT) {
            PlayerId speaker = game.round().currentTurnPlayer().orElseThrow();
            game.submitHint(speaker, "힌트-" + speaker.value(), T0);
        }
    }
}
