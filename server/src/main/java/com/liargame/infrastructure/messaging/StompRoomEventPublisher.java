package com.liargame.infrastructure.messaging;

import com.liargame.application.port.RoomEventPublisher;
import com.liargame.application.view.ServerMessage;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.RoomId;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * STOMP 브로커로 메시지를 실어 보내는 구현체.
 *
 * <p>클라이언트 구독 주소는 세 갈래다.
 *
 * <ul>
 *   <li>{@code /topic/room/{roomId}} — 방 전체 공개 정보
 *   <li>{@code /user/queue/private} — 본인만 받는 정보(제시어, 오류)
 *   <li>{@code /topic/lobby} — 방 목록
 * </ul>
 */
@Component
public class StompRoomEventPublisher implements RoomEventPublisher {

    private static final String ROOM_DESTINATION = "/topic/room/";
    private static final String LOBBY_DESTINATION = "/topic/lobby";
    private static final String PRIVATE_DESTINATION = "/queue/private";

    private final SimpMessagingTemplate messagingTemplate;

    public StompRoomEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void toRoom(RoomId roomId, ServerMessage message) {
        messagingTemplate.convertAndSend(ROOM_DESTINATION + roomId.value(), message);
    }

    @Override
    public void toPlayer(PlayerId playerId, ServerMessage message) {
        messagingTemplate.convertAndSendToUser(playerId.value(), PRIVATE_DESTINATION, message);
    }

    @Override
    public void toLobby(ServerMessage message) {
        messagingTemplate.convertAndSend(LOBBY_DESTINATION, message);
    }
}
