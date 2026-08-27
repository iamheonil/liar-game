package com.liargame.application.view;

import java.util.Map;

/** 라운드가 끝난 뒤에만 공개되는 정답과 라이어 정체. */
public record RoundResultView(
        int round,
        String category,
        String citizenWord,
        String liarWord,
        String liarId,
        String accusedId,
        boolean liarCaught,
        String liarGuess,
        boolean liarGuessCorrect,
        String winner,
        Map<String, Integer> awardedPoints) {
}
