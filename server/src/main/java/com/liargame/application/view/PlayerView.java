package com.liargame.application.view;

/**
 * 참가자 목록 한 칸.
 *
 * @param abandoned 재접속 유예까지 지나 게임에서 완전히 빠진 상태
 */
public record PlayerView(
        String id,
        String nickname,
        boolean connected,
        boolean host,
        int score,
        boolean abandoned) {
}
