package com.liargame.domain.player;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** 닉네임이 다른 사람 화면을 망가뜨리지 못하게 막는지 검증함. */
class NicknameTest {

    private static final char ZERO_WIDTH_SPACE = 0x200B;
    private static final char RIGHT_TO_LEFT_OVERRIDE = 0x202E;
    private static final char LINE_FEED = 0x0A;

    @Test
    @DisplayName("앞뒤 공백을 다듬는다")
    void trimsSurroundingSpaces() {
        assertThat(Nickname.of("  헌일  ").value()).isEqualTo("헌일");
    }

    @Test
    @DisplayName("보이지 않는 서식 문자를 제거한다")
    void stripsInvisibleFormatting() {
        assertThat(Nickname.of("헌" + ZERO_WIDTH_SPACE + "일").value()).isEqualTo("헌일");
    }

    @Test
    @DisplayName("글자 방향을 뒤집는 문자를 제거한다")
    void stripsDirectionOverride() {
        assertThat(Nickname.of("abc" + RIGHT_TO_LEFT_OVERRIDE + "def").value())
                .isEqualTo("abcdef");
    }

    @Test
    @DisplayName("줄바꿈을 남기지 않는다")
    void stripsLineFeed() {
        assertThat(Nickname.of("한" + LINE_FEED + "일").value()).isEqualTo("한일");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "열세글자를넘어가는아주긴닉네임"})
    @DisplayName("길이 규칙을 벗어나면 거부한다")
    void rejectsOutOfRangeLength(String raw) {
        assertThatThrownBy(() -> Nickname.of(raw)).isInstanceOf(IllegalArgumentException.class);
    }
}
