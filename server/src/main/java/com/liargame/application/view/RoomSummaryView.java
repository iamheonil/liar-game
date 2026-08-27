package com.liargame.application.view;

/** 방 목록 화면의 카드 한 장. */
public record RoomSummaryView(
        String roomId,
        String title,
        String hostNickname,
        int playerCount,
        int maxPlayers,
        String status,
        int totalRounds,
        boolean joinable) {
}
