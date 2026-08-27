package com.liargame.domain.room;

import java.security.SecureRandom;
import java.util.Objects;

/**
 * 방 식별자.
 *
 * <p>친구에게 불러 주거나 URL로 공유하기 쉬워야 하므로 UUID 대신 6자리 코드를 씀. 헷갈리기 쉬운
 * 0/O, 1/I 는 알파벳에서 제외함.
 */
public record RoomId(String value) {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    public RoomId {
        Objects.requireNonNull(value, "roomId는 null일 수 없음");
        if (value.isBlank()) {
            throw new IllegalArgumentException("roomId는 공백일 수 없음");
        }
        value = value.toUpperCase();
    }

    public static RoomId generate() {
        StringBuilder code = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return new RoomId(code.toString());
    }

    public static RoomId of(String value) {
        return new RoomId(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
