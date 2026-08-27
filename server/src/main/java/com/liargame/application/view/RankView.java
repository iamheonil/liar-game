package com.liargame.application.view;

/** 최종 순위표 한 줄. 동점자는 같은 등수를 받음. */
public record RankView(int rank, String playerId, String nickname, int score) {
}
