package com.liargame.domain.game;

import com.liargame.domain.RuleViolationException;
import com.liargame.domain.TextSanitizer;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.word.WordPair;
import com.liargame.domain.word.WordPairProvider;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 게임 애그리거트. 라이어 게임의 모든 규칙 판단이 여기서 이뤄짐.
 *
 * <p>이 클래스는 스프링·네트워크·시계에 의존하지 않음. 현재 시각은 항상 인자로 받고 무작위성과
 * 제시어 공급은 인터페이스로 주입받으므로, 실시간 대기 없이 전 구간을 단위 테스트할 수 있음.
 *
 * <p>단계 전이는 두 가지 경로로만 일어남.
 *
 * <ol>
 *   <li>제한 시간 만료 — 상위 계층이 {@link #onTimeout(Instant)} 를 호출
 *   <li>완료 조건 충족 — 예를 들어 전원이 투표를 마치면 남은 시간을 기다리지 않고 즉시 다음 단계로
 * </ol>
 *
 * <p>전이가 일어날 때마다 {@link #phaseToken()} 이 증가함. 상위 계층의 타이머는 예약 당시의 토큰을
 * 들고 있다가 발화 시점에 값이 달라졌으면 스스로 폐기해야 함. 조기 전이로 무의미해진 예약이
 * 뒤늦게 터져 단계를 건너뛰는 사고를 이 토큰이 막아 줌.
 */
public class Game {

    private final List<PlayerId> participants;
    private final Set<PlayerId> abandoned = new LinkedHashSet<>();
    private final int totalRounds;
    private final GameRules rules;
    private final WordPairProvider wordPairProvider;
    private final RoundRandomizer randomizer;
    private final ScoreBoard scoreBoard;
    private final List<RoundOutcome> history = new ArrayList<>();

    private Round round;
    private GamePhase phase;
    private Instant phaseEndsAt;
    private long phaseToken;

    private Game(
            List<PlayerId> participants,
            int totalRounds,
            GameRules rules,
            WordPairProvider wordPairProvider,
            RoundRandomizer randomizer) {
        this.participants = List.copyOf(participants);
        this.totalRounds = totalRounds;
        this.rules = rules;
        this.wordPairProvider = wordPairProvider;
        this.randomizer = randomizer;
        this.scoreBoard = new ScoreBoard(this.participants);
    }

    public static Game start(
            List<PlayerId> participants,
            int totalRounds,
            GameRules rules,
            WordPairProvider wordPairProvider,
            RoundRandomizer randomizer,
            Instant now) {
        if (participants.size() < GameRules.MIN_PLAYERS) {
            throw new RuleViolationException(
                    "%d명 이상이어야 시작할 수 있음".formatted(GameRules.MIN_PLAYERS));
        }
        Game game = new Game(participants, totalRounds, rules, wordPairProvider, randomizer);
        game.beginRound(1, now);
        return game;
    }

    // ------------------------------------------------------------------- 조회

    public GamePhase phase() {
        return phase;
    }

    public Instant phaseEndsAt() {
        return phaseEndsAt;
    }

    public long phaseToken() {
        return phaseToken;
    }

    public Round round() {
        return round;
    }

    public int currentRoundNumber() {
        return round == null ? 0 : round.number();
    }

    public int totalRounds() {
        return totalRounds;
    }

    public ScoreBoard scoreBoard() {
        return scoreBoard;
    }

    public List<RoundOutcome> history() {
        return List.copyOf(history);
    }

    public List<PlayerId> participants() {
        return participants;
    }

    public boolean isFinished() {
        return phase == GamePhase.GAME_RESULT;
    }

    /** 아직 게임에 남아 있는 사람. 참가 순서를 유지함. */
    public List<PlayerId> activePlayers() {
        return participants.stream().filter(id -> !abandoned.contains(id)).toList();
    }

    public boolean hasAbandoned(PlayerId id) {
        return abandoned.contains(id);
    }

    /**
     * 해당 플레이어에게만 보여줄 제시어.
     *
     * <p>라이어에게는 같은 범주의 다른 단어가 나가므로 라이어 본인도 자기가 라이어인지 알 수 없음.
     */
    public String wordFor(PlayerId id) {
        return round == null ? null : round.wordFor(id);
    }

    public boolean canChat(PlayerId id) {
        if (abandoned.contains(id)) {
            return false;
        }
        return phase.allowsChatFrom(id, round == null ? null : round.accusedId());
    }

    // ------------------------------------------------------------- 플레이어 행동

    public void submitHint(PlayerId speaker, String text, Instant now) {
        requirePhase(GamePhase.HINT);
        requireActive(speaker);
        PlayerId turnHolder = round.currentTurnPlayer()
                .orElseThrow(() -> new RuleViolationException("힌트 순서가 이미 끝남"));
        if (!turnHolder.equals(speaker)) {
            throw new RuleViolationException("아직 당신의 차례가 아님");
        }
        String trimmed = text == null ? "" : text.trim();
        if (trimmed.isEmpty()) {
            throw new RuleViolationException("힌트를 입력해야 함");
        }
        if (trimmed.length() > GameRules.MAX_HINT_LENGTH) {
            throw new RuleViolationException(
                    "힌트는 %d자 이내여야 함".formatted(GameRules.MAX_HINT_LENGTH));
        }
        round.recordHint(trimmed);
        beginHintPhase(now);
    }

    /**
     * 자유토론 조기 종료 요청(/스킵).
     *
     * @return 지금까지 모인 동의 수
     */
    public int requestSkip(PlayerId requester, Instant now) {
        requirePhase(GamePhase.DISCUSSION);
        requireActive(requester);
        if (!round.requestSkip(requester)) {
            throw new RuleViolationException("이미 스킵에 동의함");
        }
        int agreed = round.skipRequests().size();
        if (agreed >= skipThreshold()) {
            beginVote(now);
        }
        return agreed;
    }

    /** 자유토론을 건너뛰는 데 필요한 동의 수. 남아 있는 전원에서 한 명을 뺀 값. */
    public int skipThreshold() {
        return Math.max(1, activePlayers().size() - 1);
    }

    public void castVote(PlayerId voter, PlayerId target, Instant now) {
        requirePhase(GamePhase.VOTE);
        requireActive(voter);
        requireActive(target);
        if (voter.equals(target)) {
            throw new RuleViolationException("자기 자신은 지목할 수 없음");
        }
        round.accusation().cast(voter, target);
        if (round.accusation().castCount() >= activePlayers().size()) {
            resolveAccusation(now);
        }
    }

    public void castFinalVote(PlayerId voter, boolean approveExecution, Instant now) {
        requirePhase(GamePhase.FINAL_VOTE);
        requireActive(voter);
        if (voter.equals(round.accusedId())) {
            throw new RuleViolationException("지목된 사람은 자신의 생사에 투표할 수 없음");
        }
        round.survival().cast(voter, approveExecution);
        if (round.survival().castCount() >= finalVoteElectorate()) {
            resolveFinalVote(now);
        }
    }

    public void submitGuess(PlayerId guesser, String guess, Instant now) {
        requirePhase(GamePhase.LIAR_GUESS);
        if (!round.isLiar(guesser)) {
            throw new RuleViolationException("라이어만 제시어를 맞힐 수 있음");
        }
        String trimmed = guess == null ? "" : guess.trim();
        if (trimmed.isEmpty()) {
            throw new RuleViolationException("제시어를 입력해야 함");
        }
        if (trimmed.length() > GameRules.MAX_GUESS_LENGTH) {
            throw new RuleViolationException(
                    "제시어는 %d자 이내여야 함".formatted(GameRules.MAX_GUESS_LENGTH));
        }
        round.recordLiarGuess(trimmed);
        resolveLiarGuess(now);
    }

    // -------------------------------------------------------------- 시간·이탈

    /** 현재 단계의 제한 시간이 만료됐을 때 호출됨. */
    public void onTimeout(Instant now) {
        switch (phase) {
            case ROLE_REVEAL -> beginHintPhase(now);
            case HINT -> {
                round.skipCurrentTurn();
                beginHintPhase(now);
            }
            case DISCUSSION -> beginVote(now);
            case VOTE -> resolveAccusation(now);
            case DEFENSE -> enter(GamePhase.FINAL_VOTE, now);
            case FINAL_VOTE -> resolveFinalVote(now);
            case LIAR_GUESS -> resolveLiarGuess(now);
            case ROUND_RESULT -> advanceToNextRound(now);
            case GAME_RESULT -> {
                // 종료 상태에서는 더 이상 전이하지 않음
            }
        }
    }

    /**
     * 재접속 유예 시간까지 지나 완전히 이탈한 것으로 확정된 플레이어를 게임에서 제외함.
     *
     * <p>남은 인원이 최소 인원 미만이면 게임 자체가 끝나고, 라이어가 사라졌다면 추리가 성립하지
     * 않으므로 해당 라운드는 무효 처리함.
     */
    public void abandon(PlayerId leaver, Instant now) {
        if (!participants.contains(leaver) || !abandoned.add(leaver)) {
            return;
        }
        if (isFinished()) {
            return;
        }
        round.discardVotesOf(leaver);

        if (activePlayers().size() < GameRules.MIN_PLAYERS) {
            finish(now);
            return;
        }
        if (phase == GamePhase.ROUND_RESULT) {
            return;
        }
        if (round.isLiar(leaver)) {
            endRound(now, null, false, null, false, RoundEnding.ABORTED, Winner.NONE);
            return;
        }
        switch (phase) {
            case HINT -> {
                if (round.currentTurnPlayer().filter(leaver::equals).isPresent()) {
                    round.skipCurrentTurn();
                }
                beginHintPhase(now);
            }
            case DISCUSSION -> {
                if (round.skipRequests().size() >= skipThreshold()) {
                    beginVote(now);
                }
            }
            case VOTE -> {
                if (round.accusation().castCount() >= activePlayers().size()) {
                    resolveAccusation(now);
                }
            }
            case DEFENSE, FINAL_VOTE -> {
                if (leaver.equals(round.accusedId())) {
                    endRound(now, null, false, null, false, RoundEnding.ACQUITTED, Winner.LIAR);
                } else if (phase == GamePhase.FINAL_VOTE
                        && round.survival().castCount() >= finalVoteElectorate()) {
                    resolveFinalVote(now);
                }
            }
            default -> {
                // ROLE_REVEAL, LIAR_GUESS 는 타이머 만료로 자연히 진행됨
            }
        }
    }

    // -------------------------------------------------------------- 내부 전이

    private void beginRound(int number, Instant now) {
        List<PlayerId> active = activePlayers();
        WordPair pair = wordPairProvider.next();
        PlayerId liar = randomizer.pickLiar(active);
        round = new Round(number, pair, liar, randomizer.shuffleTurnOrder(active));
        enter(GamePhase.ROLE_REVEAL, now);
    }

    /** 다음 발언자에게 차례를 넘기거나, 모두 끝났으면 자유토론으로 전환함. */
    private void beginHintPhase(Instant now) {
        skipAbandonedTurns();
        if (round.isHintPhaseComplete()) {
            enter(GamePhase.DISCUSSION, now);
        } else {
            enter(GamePhase.HINT, now);
        }
    }

    private void skipAbandonedTurns() {
        while (round.currentTurnPlayer().filter(abandoned::contains).isPresent()) {
            round.skipCurrentTurn();
        }
    }

    private void beginVote(Instant now) {
        round.beginVoteAttempt();
        enter(GamePhase.VOTE, now);
    }

    private void resolveAccusation(Instant now) {
        Optional<PlayerId> accused = round.accusation().majorityOf(activePlayers().size());
        if (accused.isEmpty()) {
            endRound(now, null, false, null, false, RoundEnding.NO_MAJORITY, Winner.LIAR);
            return;
        }
        round.accuse(accused.get());
        enter(GamePhase.DEFENSE, now);
    }

    /** 최후 투표의 유권자 수. 지목당한 본인은 자신의 생사에 투표하지 못하므로 제외함. */
    private int finalVoteElectorate() {
        return Math.max(1, activePlayers().size() - 1);
    }

    private void resolveFinalVote(Instant now) {
        PlayerId accused = round.accusedId();
        boolean executed = round.survival().majorityOf(finalVoteElectorate()).orElse(false);

        if (!executed) {
            if (round.voteAttempt() < rules.maxVoteAttempts()) {
                beginVote(now);
            } else {
                endRound(now, accused, false, null, false, RoundEnding.ACQUITTED, Winner.LIAR);
            }
            return;
        }
        if (round.isLiar(accused)) {
            enter(GamePhase.LIAR_GUESS, now);
        } else {
            endRound(now, accused, false, null, false, RoundEnding.WRONG_EXECUTION, Winner.LIAR);
        }
    }

    private void resolveLiarGuess(Instant now) {
        String guess = round.liarGuess();
        boolean correct = matchesCitizenWord(guess);
        endRound(now, round.accusedId(), true, guess, correct, RoundEnding.LIAR_EXECUTED,
                correct ? Winner.LIAR : Winner.CITIZEN);
    }

    /** 띄어쓰기와 영문 대소문자 차이는 정답으로 인정함. */
    private boolean matchesCitizenWord(String guess) {
        if (guess == null) {
            return false;
        }
        String normalized = TextSanitizer.withoutWhitespace(guess).toLowerCase();
        String answer = round.words().citizenWord().text();
        return normalized.equals(TextSanitizer.withoutWhitespace(answer).toLowerCase());
    }

    private void endRound(
            Instant now,
            PlayerId accusedId,
            boolean liarCaught,
            String liarGuess,
            boolean liarGuessCorrect,
            RoundEnding ending,
            Winner winner) {
        Map<PlayerId, Integer> awarded = awardPoints(winner);
        scoreBoard.award(awarded);
        history.add(new RoundOutcome(
                round.number(),
                round.words().category(),
                round.words().citizenWord().text(),
                round.words().liarWord().text(),
                round.liarId(),
                accusedId,
                liarCaught,
                liarGuess,
                liarGuessCorrect,
                ending,
                winner,
                awarded));
        enter(GamePhase.ROUND_RESULT, now);
    }

    private Map<PlayerId, Integer> awardPoints(Winner winner) {
        Map<PlayerId, Integer> awarded = new HashMap<>();
        switch (winner) {
            case CITIZEN -> activePlayers().stream()
                    .filter(id -> !round.isLiar(id))
                    .forEach(id -> awarded.put(id, rules.citizenWinPoint()));
            case LIAR -> {
                if (!abandoned.contains(round.liarId())) {
                    awarded.put(round.liarId(), rules.liarWinPoint());
                }
            }
            case NONE -> {
                // 라운드 무효 — 점수 변동 없음
            }
        }
        return awarded;
    }

    private void advanceToNextRound(Instant now) {
        if (round.number() >= totalRounds || activePlayers().size() < GameRules.MIN_PLAYERS) {
            finish(now);
        } else {
            beginRound(round.number() + 1, now);
        }
    }

    private void finish(Instant now) {
        enter(GamePhase.GAME_RESULT, now);
    }

    private void enter(GamePhase next, Instant now) {
        this.phase = next;
        Duration duration = rules.durationOf(next);
        this.phaseEndsAt = duration.isZero() ? null : now.plus(duration);
        this.phaseToken++;
    }

    private void requirePhase(GamePhase expected) {
        if (phase != expected) {
            throw new RuleViolationException("지금은 할 수 없는 행동임");
        }
    }

    private void requireActive(PlayerId id) {
        if (!participants.contains(id)) {
            throw new RuleViolationException("이번 게임의 참가자가 아님");
        }
        if (abandoned.contains(id)) {
            throw new RuleViolationException("이미 게임에서 이탈한 플레이어임");
        }
    }
}
