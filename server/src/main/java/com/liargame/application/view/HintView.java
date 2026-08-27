package com.liargame.application.view;

/** 힌트 보드에 한 줄로 표시되는 발언. */
public record HintView(int order, String playerId, String text, boolean passed) {
}
