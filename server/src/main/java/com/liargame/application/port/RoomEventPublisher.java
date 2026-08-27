package com.liargame.application.port;

import com.liargame.application.view.ServerMessage;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.RoomId;

/**
 * 클라이언트로 나가는 실시간 메시지 발행 계약.
 *
 * <p>애플리케이션 계층은 STOMP나 WebSocket을 몰라야 하므로 전송 수단은 구현체가 결정함.
 */
public interface RoomEventPublisher {

    /** 방 안의 모든 사람에게 보냄. */
    void toRoom(RoomId roomId, ServerMessage message);

    /** 특정 한 사람에게만 보냄. 제시어처럼 남이 보면 안 되는 정보에 사용함. */
    void toPlayer(PlayerId playerId, ServerMessage message);

    /** 방 목록 화면을 보고 있는 사람들에게 보냄. */
    void toLobby(ServerMessage message);
}
