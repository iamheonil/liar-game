package com.liargame.domain.game;

import com.liargame.domain.player.PlayerId;

/**
 * 한 플레이어가 제출한 힌트.
 *
 * @param passed 제한 시간 안에 입력하지 못해 자동으로 넘어간 경우 true
 */
public record Hint(int order, PlayerId playerId, String text, boolean passed) {

    public static Hint of(int order, PlayerId playerId, String text) {
        return new Hint(order, playerId, text, false);
    }

    public static Hint pass(int order, PlayerId playerId) {
        return new Hint(order, playerId, "", true);
    }
}
