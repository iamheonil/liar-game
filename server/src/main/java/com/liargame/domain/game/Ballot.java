package com.liargame.domain.game;

import com.liargame.domain.player.PlayerId;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 투표함. 지목 투표(대상=PlayerId)와 생사 투표(대상=Boolean) 양쪽에 재사용됨.
 *
 * <p>한 사람당 한 표이며 마지막에 던진 표로 덮어씀(제한 시간 안에는 변경 가능).
 *
 * @param <T> 표의 대상 타입
 */
public class Ballot<T> {

    private final Map<PlayerId, T> votes = new LinkedHashMap<>();

    public void cast(PlayerId voter, T choice) {
        votes.put(voter, choice);
    }

    public boolean hasVoted(PlayerId voter) {
        return votes.containsKey(voter);
    }

    public int castCount() {
        return votes.size();
    }

    public Map<PlayerId, T> asMap() {
        return Collections.unmodifiableMap(votes);
    }

    public Map<T, Integer> tally() {
        Map<T, Integer> counts = new HashMap<>();
        votes.values().forEach(choice -> counts.merge(choice, 1, Integer::sum));
        return counts;
    }

    /**
     * 과반수를 얻은 대상을 반환함.
     *
     * <p>동률이거나 과반에 못 미치면 비어 있음. 기권표를 포함한 전체 유권자 수를 기준으로 하므로
     * 투표하지 않은 사람은 사실상 반대표로 작용함.
     */
    public Optional<T> majorityOf(int electorate) {
        int threshold = electorate / 2 + 1;
        return tally().entrySet().stream()
                .filter(entry -> entry.getValue() >= threshold)
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey);
    }

    /** 특정 플레이어가 던진 표를 제거함. */
    public void discardVotesBy(PlayerId voter) {
        votes.remove(voter);
    }

    /**
     * 특정 플레이어가 던졌거나 그 플레이어를 대상으로 삼은 표를 모두 제거함.
     *
     * <p>이탈자가 생겼을 때 사라진 사람에게 꽂힌 표까지 걷어내야 남은 인원 기준 과반이 정상 계산됨.
     */
    public void discardVotesInvolving(PlayerId id) {
        votes.entrySet().removeIf(entry -> entry.getKey().equals(id) || id.equals(entry.getValue()));
    }

    public void clear() {
        votes.clear();
    }
}
