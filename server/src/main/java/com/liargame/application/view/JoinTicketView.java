package com.liargame.application.view;

/**
 * 방을 만들거나 입장한 직후 클라이언트가 받아 두어야 할 최소 정보.
 *
 * <p>playerId 는 이후 WebSocket 핸드셰이크에서 본인을 증명하는 값이라 브라우저가 보관했다가
 * 재접속 때 그대로 다시 제시함.
 */
public record JoinTicketView(String roomId, String title, String playerId, String nickname) {
}
