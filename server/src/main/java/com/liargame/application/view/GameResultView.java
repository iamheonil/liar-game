package com.liargame.application.view;

import java.util.List;

/** 게임 종료 화면에 쓰이는 최종 집계. */
public record GameResultView(List<RankView> ranking, List<RoundResultView> rounds) {
}
