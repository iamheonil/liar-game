package com.liargame.domain.room;

import java.util.List;

/**
 * 방장이 조정할 수 있는 방 설정.
 *
 * <p>게임 진행 중에는 바꿀 수 없고, 대기실이나 결과 화면에서만 변경 가능함.
 */
public record RoomSettings(int totalRounds) {

    public static final List<Integer> ALLOWED_ROUNDS = List.of(3, 5, 7);

    public RoomSettings {
        if (!ALLOWED_ROUNDS.contains(totalRounds)) {
            throw new IllegalArgumentException(
                    "라운드 수는 %s 중 하나여야 함".formatted(ALLOWED_ROUNDS));
        }
    }

    public static RoomSettings defaults() {
        return new RoomSettings(3);
    }

    public RoomSettings withRounds(int rounds) {
        return new RoomSettings(rounds);
    }
}
