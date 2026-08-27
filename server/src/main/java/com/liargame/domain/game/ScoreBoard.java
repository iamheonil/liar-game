package com.liargame.domain.game;

import com.liargame.domain.player.PlayerId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 게임 전체에 걸친 누적 점수. */
public class ScoreBoard {

    private final Map<PlayerId, Integer> scores = new LinkedHashMap<>();

    public ScoreBoard(List<PlayerId> participants) {
        participants.forEach(id -> scores.put(id, 0));
    }

    public void award(Map<PlayerId, Integer> points) {
        points.forEach((id, point) -> scores.merge(id, point, Integer::sum));
    }

    public int scoreOf(PlayerId id) {
        return scores.getOrDefault(id, 0);
    }

    public Map<PlayerId, Integer> snapshot() {
        return Map.copyOf(scores);
    }

    /** 점수 내림차순 정렬된 참가자. 동점자는 참가 순서를 유지함. */
    public List<PlayerId> ranking() {
        return scores.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<PlayerId, Integer> e) -> e.getValue())
                        .reversed())
                .map(Map.Entry::getKey)
                .toList();
    }
}
