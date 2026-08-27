package com.liargame.domain.player;

import com.liargame.domain.TextSanitizer;
import java.util.Objects;

/** 사용자가 입력한 닉네임. 생성 시점에 정규화·검증을 마쳐 이후 계층에서는 항상 유효함이 보장됨. */
public record Nickname(String value) {

    public static final int MIN_LENGTH = 1;
    public static final int MAX_LENGTH = 12;

    public Nickname {
        Objects.requireNonNull(value, "닉네임은 null일 수 없음");
        value = TextSanitizer.visibleOnly(value);
        if (value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException(
                    "닉네임은 %d~%d자여야 함".formatted(MIN_LENGTH, MAX_LENGTH));
        }
    }

    public static Nickname of(String raw) {
        return new Nickname(raw);
    }

    @Override
    public String toString() {
        return value;
    }
}
