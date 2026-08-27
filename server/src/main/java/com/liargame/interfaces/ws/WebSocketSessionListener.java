package com.liargame.interfaces.ws;

import com.liargame.application.service.PlayerSessionService;
import com.liargame.config.WebSocketConfig;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.RoomId;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * WebSocket 연결과 종료를 방 상태에 연결함.
 *
 * <p>접속 판정에 {@code SessionConnectedEvent} 가 아니라 {@link SessionConnectEvent} 를 쓰는 이유가
 * 있음. 앞의 것은 서버가 되돌려 보내는 CONNECTED 프레임에 대한 이벤트라 핸드셰이크 때 담아 둔 방·
 * 참가자 정보가 실려 오지 않음. 뒤의 것은 클라이언트가 보낸 CONNECT 프레임 자체라 그 정보가
 * 그대로 들어 있음.
 *
 * <p>이 시점에는 클라이언트가 아직 구독을 걸기 전이라 여기서 보낸 방송을 본인은 놓칠 수 있음.
 * 그래서 클라이언트는 구독을 마친 직후 sync 를 한 번 보내 현재 상태를 다시 받아 감.
 *
 * <p>방 목록 화면처럼 방에 속하지 않은 접속도 있으므로, 방 정보가 없는 세션은 그냥 흘려보냄.
 */
@Component
public class WebSocketSessionListener {

    private static final Logger log = LoggerFactory.getLogger(WebSocketSessionListener.class);

    private final PlayerSessionService sessions;

    public WebSocketSessionListener(PlayerSessionService sessions) {
        this.sessions = sessions;
    }

    @EventListener
    public void onConnect(SessionConnectEvent event) {
        membershipOf(event.getMessage()).ifPresent(membership -> {
            log.debug("접속 room={} player={}", membership.roomId(), membership.playerId());
            sessions.onConnected(membership.roomId(), membership.playerId());
        });
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        membershipOf(event.getMessage()).ifPresent(membership -> {
            log.debug("종료 room={} player={}", membership.roomId(), membership.playerId());
            sessions.onDisconnected(membership.roomId(), membership.playerId());
        });
    }

    private Optional<Membership> membershipOf(Message<byte[]> message) {
        Map<String, Object> attributes = StompHeaderAccessor.wrap(message).getSessionAttributes();
        if (attributes == null) {
            return Optional.empty();
        }
        Object roomId = attributes.get(WebSocketConfig.ATTR_ROOM_ID);
        Object playerId = attributes.get(WebSocketConfig.ATTR_PLAYER_ID);
        if (roomId instanceof String room && playerId instanceof String player) {
            return Optional.of(new Membership(RoomId.of(room), PlayerId.of(player)));
        }
        return Optional.empty();
    }

    private record Membership(RoomId roomId, PlayerId playerId) {
    }
}
