package com.liargame.infrastructure.word;

import java.util.List;

/**
 * words.json 의 구조를 그대로 옮긴 형태.
 *
 * <p>같은 범주 안에서 두 단어를 뽑아야 라이어가 받는 단어가 그럴듯해지므로, 사전은 범주 단위로
 * 묶여 있어야 함.
 */
public record WordDictionary(List<Category> categories) {

    public record Category(String name, List<String> words) {
    }
}
