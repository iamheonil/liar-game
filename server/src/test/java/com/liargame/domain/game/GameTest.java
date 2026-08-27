package com.liargame.domain.game;

import static com.liargame.domain.game.GameFixtures.CITIZEN_WORD;
import static com.liargame.domain.game.GameFixtures.LIAR_WORD;
import static com.liargame.domain.game.GameFixtures.T0;
import static com.liargame.domain.game.GameFixtures.completeHints;
import static com.liargame.domain.game.GameFixtures.start;
import static com.liargame.domain.game.GameFixtures.timeout;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.liargame.domain.RuleViolationException;
import com.liargame.domain.player.PlayerId;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/** 라이어 게임 진행 규칙 전반을 검증함. */
class GameTest {

    private static final int PLAYERS = 4;
    private static final int LIAR_INDEX = 1;

    private final List<PlayerId> ids = GameFixtures.players(PLAYERS);

    private PlayerId liar() {
        return ids.get(LIAR_INDEX);
    }

    private List<PlayerId> citizens() {
        return ids.stream().filter(id -> !id.equals(liar())).toList();
    }

    @Nested
    @DisplayName("제시어 배분")
    class WordAssignment {

        @Test
        @DisplayName("라이어는 시민과 다른 단어를 받는다")
        void liarGetsDifferentWord() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);

            assertThat(game.wordFor(ids.get(0))).isEqualTo(CITIZEN_WORD);
            assertThat(game.wordFor(liar())).isEqualTo(LIAR_WORD);
        }

        @Test
        @DisplayName("게임은 역할 공개 단계에서 시작한다")
        void startsAtRoleReveal() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);

            assertThat(game.phase()).isEqualTo(GamePhase.ROLE_REVEAL);
            assertThat(game.currentRoundNumber()).isEqualTo(1);
        }

        @Test
        @DisplayName("최소 인원에 못 미치면 시작할 수 없다")
        void rejectsTooFewPlayers() {
            assertThatThrownBy(() -> start(1, 0, 3))
                    .isInstanceOf(RuleViolationException.class);
        }
    }

    @Nested
    @DisplayName("힌트 단계")
    class HintPhase {

        @Test
        @DisplayName("자기 차례가 아니면 힌트를 낼 수 없다")
        void rejectsOutOfTurnHint() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            timeout(game);

            assertThat(game.phase()).isEqualTo(GamePhase.HINT);
            assertThatThrownBy(() -> game.submitHint(ids.get(2), "사슴", T0))
                    .isInstanceOf(RuleViolationException.class)
                    .hasMessageContaining("차례");
        }

        @Test
        @DisplayName("전원이 힌트를 내면 자유토론으로 넘어간다")
        void movesToDiscussionAfterAllHints() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            completeHints(game);

            assertThat(game.phase()).isEqualTo(GamePhase.DISCUSSION);
            assertThat(game.round().hints()).hasSize(PLAYERS);
        }

        @Test
        @DisplayName("시간이 다 되면 발언 없이 다음 차례로 넘어간다")
        void passesOnTimeout() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            timeout(game);
            timeout(game);

            assertThat(game.round().hints()).hasSize(1);
            assertThat(game.round().hints().get(0).passed()).isTrue();
            assertThat(game.round().currentTurnPlayer()).contains(ids.get(1));
        }
    }

    @Nested
    @DisplayName("자유토론과 투표 전환")
    class DiscussionPhase {

        @Test
        @DisplayName("전원에서 한 명을 뺀 만큼 스킵에 동의하면 즉시 투표로 넘어간다")
        void skipsWhenThresholdReached() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            completeHints(game);

            game.requestSkip(ids.get(0), T0);
            game.requestSkip(ids.get(1), T0);
            assertThat(game.phase()).isEqualTo(GamePhase.DISCUSSION);

            game.requestSkip(ids.get(2), T0);
            assertThat(game.phase()).isEqualTo(GamePhase.VOTE);
        }

        @Test
        @DisplayName("같은 사람이 두 번 스킵할 수 없다")
        void rejectsDuplicateSkip() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            completeHints(game);
            game.requestSkip(ids.get(0), T0);

            assertThatThrownBy(() -> game.requestSkip(ids.get(0), T0))
                    .isInstanceOf(RuleViolationException.class);
        }
    }

    @Nested
    @DisplayName("지목 투표")
    class AccusationVote {

        @Test
        @DisplayName("과반 득표자가 나오면 최후 진술로 넘어간다")
        void movesToDefenseOnMajority() {
            Game game = reachFinalVoteEntry();

            assertThat(game.phase()).isEqualTo(GamePhase.DEFENSE);
            assertThat(game.round().accusedId()).isEqualTo(liar());
        }

        @Test
        @DisplayName("자기 자신은 지목할 수 없다")
        void rejectsSelfVote() {
            Game game = reachVote();

            assertThatThrownBy(() -> game.castVote(ids.get(0), ids.get(0), T0))
                    .isInstanceOf(RuleViolationException.class);
        }

        @Test
        @DisplayName("과반 득표자가 없으면 라이어가 살아남아 라운드가 끝난다")
        void liarSurvivesWhenNoMajority() {
            Game game = reachVote();

            game.castVote(ids.get(0), ids.get(1), T0);
            game.castVote(ids.get(1), ids.get(0), T0);
            game.castVote(ids.get(2), ids.get(3), T0);
            game.castVote(ids.get(3), ids.get(2), T0);

            assertThat(game.phase()).isEqualTo(GamePhase.ROUND_RESULT);
            RoundOutcome outcome = lastOutcome(game);
            assertThat(outcome.winner()).isEqualTo(Winner.LIAR);
            assertThat(outcome.liarCaught()).isFalse();
            assertThat(game.scoreBoard().scoreOf(liar())).isEqualTo(2);
        }
    }

    @Nested
    @DisplayName("최후 진술과 생사 투표")
    class FinalVote {

        @Test
        @DisplayName("지목당한 사람은 자신의 생사에 투표할 수 없다")
        void accusedCannotVote() {
            Game game = reachFinalVote();

            assertThatThrownBy(() -> game.castFinalVote(liar(), false, T0))
                    .isInstanceOf(RuleViolationException.class);
        }

        @Test
        @DisplayName("처형이 가결되고 지목이 라이어였다면 제시어 맞히기로 넘어간다")
        void movesToGuessWhenLiarExecuted() {
            Game game = reachFinalVote();

            citizens().forEach(citizen -> game.castFinalVote(citizen, true, T0));

            assertThat(game.phase()).isEqualTo(GamePhase.LIAR_GUESS);
        }

        @Test
        @DisplayName("부결되면 다시 지목 투표를 진행한다")
        void revotesWhenRejected() {
            Game game = reachFinalVote();

            citizens().forEach(citizen -> game.castFinalVote(citizen, false, T0));

            assertThat(game.phase()).isEqualTo(GamePhase.VOTE);
            assertThat(game.round().voteAttempt()).isEqualTo(2);
            assertThat(game.round().accusedId()).isNull();
        }

        @Test
        @DisplayName("재투표까지 부결되면 라이어가 살아남고 라운드가 끝난다")
        void endsRoundAfterMaxAttempts() {
            Game game = reachFinalVote();
            citizens().forEach(citizen -> game.castFinalVote(citizen, false, T0));

            citizens().forEach(citizen -> game.castVote(citizen, liar(), T0));
            game.castVote(liar(), ids.get(0), T0);
            timeout(game);
            citizens().forEach(citizen -> game.castFinalVote(citizen, false, T0));

            assertThat(game.phase()).isEqualTo(GamePhase.ROUND_RESULT);
            assertThat(lastOutcome(game).winner()).isEqualTo(Winner.LIAR);
        }

        @Test
        @DisplayName("시민을 처형하면 라이어가 이긴다")
        void liarWinsWhenCitizenExecuted() {
            Game game = reachVote();
            PlayerId scapegoat = ids.get(2);
            ids.stream()
                    .filter(id -> !id.equals(scapegoat))
                    .forEach(voter -> game.castVote(voter, scapegoat, T0));
            game.castVote(scapegoat, ids.get(0), T0);
            timeout(game);

            ids.stream()
                    .filter(id -> !id.equals(scapegoat))
                    .forEach(voter -> game.castFinalVote(voter, true, T0));

            assertThat(game.phase()).isEqualTo(GamePhase.ROUND_RESULT);
            assertThat(lastOutcome(game).winner()).isEqualTo(Winner.LIAR);
            assertThat(lastOutcome(game).liarCaught()).isFalse();
        }
    }

    @Nested
    @DisplayName("라이어의 마지막 반격")
    class LiarGuess {

        @Test
        @DisplayName("제시어를 맞히면 라이어가 이긴다")
        void liarWinsOnCorrectGuess() {
            Game game = reachLiarGuess();

            game.submitGuess(liar(), CITIZEN_WORD, T0);

            RoundOutcome outcome = lastOutcome(game);
            assertThat(outcome.winner()).isEqualTo(Winner.LIAR);
            assertThat(outcome.liarGuessCorrect()).isTrue();
            assertThat(game.scoreBoard().scoreOf(liar())).isEqualTo(2);
        }

        @Test
        @DisplayName("띄어쓰기와 대소문자 차이는 정답으로 인정한다")
        void ignoresWhitespaceAndCase() {
            Game game = reachLiarGuess();

            game.submitGuess(liar(), "  호 랑 이 ", T0);

            assertThat(lastOutcome(game).liarGuessCorrect()).isTrue();
        }

        @Test
        @DisplayName("틀리면 시민 전원이 점수를 얻는다")
        void citizensWinOnWrongGuess() {
            Game game = reachLiarGuess();

            game.submitGuess(liar(), "코끼리", T0);

            RoundOutcome outcome = lastOutcome(game);
            assertThat(outcome.winner()).isEqualTo(Winner.CITIZEN);
            assertThat(outcome.liarCaught()).isTrue();
            citizens().forEach(citizen ->
                    assertThat(game.scoreBoard().scoreOf(citizen)).isEqualTo(1));
            assertThat(game.scoreBoard().scoreOf(liar())).isZero();
        }

        @Test
        @DisplayName("시간이 다 되면 오답으로 처리한다")
        void treatsTimeoutAsWrongGuess() {
            Game game = reachLiarGuess();

            timeout(game);

            assertThat(lastOutcome(game).winner()).isEqualTo(Winner.CITIZEN);
        }

        @Test
        @DisplayName("라이어가 아닌 사람은 제시어를 맞힐 수 없다")
        void onlyLiarCanGuess() {
            Game game = reachLiarGuess();

            assertThatThrownBy(() -> game.submitGuess(ids.get(0), CITIZEN_WORD, T0))
                    .isInstanceOf(RuleViolationException.class);
        }
    }

    @Nested
    @DisplayName("라운드 진행과 종료")
    class RoundProgress {

        @Test
        @DisplayName("설정한 라운드를 모두 마치면 게임이 끝난다")
        void finishesAfterConfiguredRounds() {
            Game game = start(PLAYERS, LIAR_INDEX, 2);

            playRoundToEnd(game);
            assertThat(game.currentRoundNumber()).isEqualTo(1);
            timeout(game);

            assertThat(game.currentRoundNumber()).isEqualTo(2);
            playRoundToEnd(game);
            timeout(game);

            assertThat(game.phase()).isEqualTo(GamePhase.GAME_RESULT);
            assertThat(game.isFinished()).isTrue();
            assertThat(game.history()).hasSize(2);
        }

        @Test
        @DisplayName("단계가 바뀔 때마다 단계 토큰이 증가한다")
        void bumpsPhaseTokenOnEveryTransition() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            long before = game.phaseToken();

            timeout(game);

            assertThat(game.phaseToken()).isGreaterThan(before);
        }
    }

    @Nested
    @DisplayName("중도 이탈")
    class Abandonment {

        @Test
        @DisplayName("라이어가 이탈하면 라운드가 무효 처리된다")
        void voidsRoundWhenLiarLeaves() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            completeHints(game);

            game.abandon(liar(), T0);

            assertThat(game.phase()).isEqualTo(GamePhase.ROUND_RESULT);
            assertThat(lastOutcome(game).winner()).isEqualTo(Winner.NONE);
            assertThat(game.scoreBoard().snapshot().values()).allMatch(score -> score == 0);
        }

        @Test
        @DisplayName("남은 인원이 최소 인원 미만이면 게임이 즉시 끝난다")
        void finishesWhenTooFewRemain() {
            Game game = start(3, 0, 3);
            List<PlayerId> three = GameFixtures.players(3);

            game.abandon(three.get(1), T0);
            game.abandon(three.get(2), T0);

            assertThat(game.phase()).isEqualTo(GamePhase.GAME_RESULT);
        }

        @Test
        @DisplayName("이탈자는 힌트 차례에서 자동으로 건너뛴다")
        void skipsAbandonedPlayerTurn() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            timeout(game);
            game.abandon(ids.get(2), T0);

            game.submitHint(ids.get(0), "발톱", T0);
            game.submitHint(ids.get(1), "갈기", T0);

            assertThat(game.round().currentTurnPlayer()).contains(ids.get(3));
        }

        @Test
        @DisplayName("이탈자에게 꽂힌 표는 무효가 된다")
        void discardsVotesInvolvingLeaver() {
            Game game = reachVote();
            game.castVote(ids.get(0), ids.get(2), T0);
            game.castVote(ids.get(3), ids.get(2), T0);

            game.abandon(ids.get(2), T0);

            assertThat(game.round().accusation().asMap()).isEmpty();
            assertThat(game.phase()).isEqualTo(GamePhase.VOTE);
        }
    }

    @Nested
    @DisplayName("발언 가능 시간")
    class ChatPermission {

        @Test
        @DisplayName("힌트 단계에서는 아무도 채팅할 수 없다")
        void silentDuringHint() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            timeout(game);

            assertThat(game.canChat(ids.get(0))).isFalse();
        }

        @Test
        @DisplayName("자유토론에서는 모두 채팅할 수 있다")
        void everyoneDuringDiscussion() {
            Game game = start(PLAYERS, LIAR_INDEX, 3);
            completeHints(game);

            assertThat(game.canChat(ids.get(0))).isTrue();
        }

        @Test
        @DisplayName("최후 진술에서는 지목당한 사람만 말할 수 있다")
        void onlyAccusedDuringDefense() {
            Game game = reachFinalVoteEntry();

            assertThat(game.phase()).isEqualTo(GamePhase.DEFENSE);
            assertThat(game.canChat(liar())).isTrue();
            assertThat(game.canChat(ids.get(0))).isFalse();
        }
    }

    // ------------------------------------------------------------- 진행 보조

    /** 힌트를 모두 마치고 지목 투표 직전까지 진행함. */
    private Game reachVote() {
        Game game = start(PLAYERS, LIAR_INDEX, 3);
        completeHints(game);
        timeout(game);
        return game;
    }

    /** 라이어가 과반 득표로 지목된 최후 진술 단계까지 진행함. */
    private Game reachFinalVoteEntry() {
        Game game = reachVote();
        citizens().forEach(citizen -> game.castVote(citizen, liar(), T0));
        game.castVote(liar(), ids.get(0), T0);
        return game;
    }

    /** 최후 진술이 끝나 생사 투표가 열린 상태까지 진행함. */
    private Game reachFinalVote() {
        Game game = reachFinalVoteEntry();
        timeout(game);
        return game;
    }

    /** 라이어가 처형되어 제시어 맞히기 기회를 얻은 상태까지 진행함. */
    private Game reachLiarGuess() {
        Game game = reachFinalVote();
        citizens().forEach(citizen -> game.castFinalVote(citizen, true, T0));
        return game;
    }

    /** 라운드 하나를 라이어 검거로 끝냄. */
    private void playRoundToEnd(Game game) {
        completeHints(game);
        timeout(game);
        citizens().forEach(citizen -> game.castVote(citizen, liar(), T0));
        game.castVote(liar(), game.activePlayers().get(0), T0);
        timeout(game);
        citizens().forEach(citizen -> game.castFinalVote(citizen, true, T0));
        game.submitGuess(liar(), "코끼리", T0);
    }

    private RoundOutcome lastOutcome(Game game) {
        List<RoundOutcome> history = game.history();
        return history.get(history.size() - 1);
    }
}
