package com.liargame.domain.player;

import java.util.Objects;
import java.util.UUID;

/**
 * 플레이어 식별자.
 *
 * <p>이 값은 식별자인 동시에 접속 자격 증명(capability token)으로 쓰임.
 * WebSocket 핸드셰이크에서 이 값으로 본인을 증명하므로 추측 불가능해야 하며,
 * 따라서 순번이 아닌 UUIDv4를 사용함.
 */
public record PlayerId(String value) {

    public PlayerId {
        Objects.requireNonNull(value, "playerId는 null일 수 없음");
        if (value.isBlank()) {
            throw new IllegalArgumentException("playerId는 공백일 수 없음");
        }
    }

    public static PlayerId generate() {
        return new PlayerId(UUID.randomUUID().toString());
    }

    public static PlayerId of(String value) {
        return new PlayerId(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
