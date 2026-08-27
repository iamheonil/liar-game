package com.liargame.domain.game;

import com.liargame.domain.player.PlayerId;
import com.liargame.domain.word.WordPair;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 한 라운드의 진행 상태.
 *
 * <p>단계 전이 판단은 {@link Game}이 하고, 여기서는 "이 라운드에서 지금까지 무슨 일이 있었는지"만
 * 들고 있음. 라이어 정체와 제시어 쌍은 라운드가 끝나기 전까지 외부로 나가면 안 되는 정보임.
 */
public class Round {

    private final int number;
    private final WordPair words;
    private final PlayerId liarId;
    private final List<PlayerId> turnOrder;
    private final List<Hint> hints = new ArrayList<>();
    private final Set<PlayerId> skipRequests = new LinkedHashSet<>();
    private final Ballot<PlayerId> accusation = new Ballot<>();
    private final Ballot<Boolean> survival = new Ballot<>();

    private int turnIndex;
    private int voteAttempt;
    private PlayerId accusedId;
    private String liarGuess;

    public Round(int number, WordPair words, PlayerId liarId, List<PlayerId> turnOrder) {
        this.number = number;
        this.words = words;
        this.liarId = liarId;
        this.turnOrder = List.copyOf(turnOrder);
    }

    public int number() {
        return number;
    }

    public WordPair words() {
        return words;
    }

    public PlayerId liarId() {
        return liarId;
    }

    public boolean isLiar(PlayerId id) {
        return liarId.equals(id);
    }

    /** 해당 플레이어가 이번 라운드에 받은 제시어. 라이어에게만 다른 단어가 나감. */
    public String wordFor(PlayerId id) {
        return isLiar(id) ? words.liarWord().text() : words.citizenWord().text();
    }

    public List<PlayerId> turnOrder() {
        return turnOrder;
    }

    public List<Hint> hints() {
        return List.copyOf(hints);
    }

    public Optional<PlayerId> currentTurnPlayer() {
        return turnIndex < turnOrder.size()
                ? Optional.of(turnOrder.get(turnIndex))
                : Optional.empty();
    }

    public int turnIndex() {
        return turnIndex;
    }

    public boolean isHintPhaseComplete() {
        return turnIndex >= turnOrder.size();
    }

    public void recordHint(String text) {
        currentTurnPlayer().ifPresent(player -> {
            hints.add(text == null || text.isBlank()
                    ? Hint.pass(hints.size() + 1, player)
                    : Hint.of(hints.size() + 1, player, text));
            turnIndex++;
        });
    }

    /** 이탈 등으로 발언 없이 차례를 건너뛸 때. */
    public void skipCurrentTurn() {
        currentTurnPlayer().ifPresent(player -> {
            hints.add(Hint.pass(hints.size() + 1, player));
            turnIndex++;
        });
    }

    public Set<PlayerId> skipRequests() {
        return Set.copyOf(skipRequests);
    }

    public boolean requestSkip(PlayerId id) {
        return skipRequests.add(id);
    }

    public Ballot<PlayerId> accusation() {
        return accusation;
    }

    public Ballot<Boolean> survival() {
        return survival;
    }

    public int voteAttempt() {
        return voteAttempt;
    }

    public void beginVoteAttempt() {
        voteAttempt++;
        accusation.clear();
        survival.clear();
        accusedId = null;
    }

    public PlayerId accusedId() {
        return accusedId;
    }

    public void accuse(PlayerId id) {
        this.accusedId = id;
    }

    public String liarGuess() {
        return liarGuess;
    }

    public void recordLiarGuess(String guess) {
        this.liarGuess = guess;
    }

    /** 이탈한 플레이어의 표를 모두 무효화함. 남은 사람의 과반 계산이 왜곡되지 않게 하기 위함. */
    public void discardVotesOf(PlayerId id) {
        accusation.discardVotesInvolving(id);
        survival.discardVotesBy(id);
    }
}
