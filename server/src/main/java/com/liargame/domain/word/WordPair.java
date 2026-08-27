package com.liargame.domain.word;

import java.util.Objects;

/**
 * 시민이 받는 제시어와 라이어가 받는 제시어의 쌍.
 *
 * <p>라이어에게 "너는 라이어다"라고 알려주지 않고 <b>같은 범주의 다른 단어</b>를 주는 방식이라,
 * 두 단어는 반드시 같은 category에 속하고 서로 달라야 함.
 */
public record WordPair(Word citizenWord, Word liarWord) {

    public WordPair {
        Objects.requireNonNull(citizenWord);
        Objects.requireNonNull(liarWord);
        if (!citizenWord.category().equals(liarWord.category())) {
            throw new IllegalArgumentException("제시어 쌍은 같은 범주여야 함");
        }
        if (citizenWord.text().equals(liarWord.text())) {
            throw new IllegalArgumentException("제시어 쌍은 서로 달라야 함");
        }
    }

    public String category() {
        return citizenWord.category();
    }
}
