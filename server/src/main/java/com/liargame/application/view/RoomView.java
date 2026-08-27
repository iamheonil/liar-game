package com.liargame.application.view;

import java.util.List;

/**
 * 방 전체 상태 스냅샷.
 *
 * <p>변경이 생길 때마다 통째로 다시 내려보냄. 최대 8명짜리 방이라 크기가 작고, 부분 갱신을 쓰지
 * 않으면 클라이언트와 서버의 상태가 어긋날 여지가 사라져 디버깅이 훨씬 쉬워짐.
 *
 * @param serverTime 스냅샷 생성 시각(epoch ms). 클라이언트가 서버와의 시계 오차를 보정해
 *     카운트다운을 정확히 그리는 데 씀
 */
public record RoomView(
        String roomId,
        String title,
        String status,
        String hostId,
        int totalRounds,
        List<Integer> allowedRounds,
        int minPlayers,
        int maxPlayers,
        List<PlayerView> players,
        GameView game,
        long serverTime) {
}
