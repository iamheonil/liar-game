package com.liargame.application.service;

import com.liargame.application.port.RoomEventPublisher;
import com.liargame.application.port.RoomRepository;
import com.liargame.application.view.ServerMessage;
import com.liargame.domain.game.Game;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.ChatMessage;
import com.liargame.domain.room.Room;
import com.liargame.domain.room.RoomId;
import java.time.Clock;
import org.springframework.stereotype.Component;

/**
 * 상태 변화를 실제 메시지로 바꿔 내보내는 곳.
 *
 * <p>어떤 정보를 누구에게 보낼지가 여기 모여 있음. 특히 제시어는 반드시 개인 채널로만 나가야 하므로
 * 그 경로를 이 클래스 밖에 두지 않음.
 */
@Component
public class RoomBroadcaster {

    private final RoomEventPublisher publisher;
    private final RoomViewAssembler assembler;
    private final RoomRepository rooms;
    private final Clock clock;

    public RoomBroadcaster(
            RoomEventPublisher publisher,
            RoomViewAssembler assembler,
            RoomRepository rooms,
            Clock clock) {
        this.publisher = publisher;
        this.assembler = assembler;
        this.rooms = rooms;
        this.clock = clock;
    }

    public void state(Room room) {
        publisher.toRoom(
                room.id(),
                ServerMessage.of(
                        ServerMessage.Type.ROOM_STATE, assembler.toRoomView(room, clock.instant())));
    }

    public void chat(Room room, ChatMessage message) {
        publisher.toRoom(
                room.id(),
                ServerMessage.of(ServerMessage.Type.CHAT, assembler.toChatView(message)));
    }

    public void chatHistory(Room room, PlayerId viewer) {
        publisher.toPlayer(
                viewer,
                ServerMessage.of(
                        ServerMessage.Type.CHAT_HISTORY,
                        room.chatHistory().stream().map(assembler::toChatView).toList()));
    }

    /** 라운드가 시작될 때 참가자 각자에게 자기 제시어만 보냄. */
    public void secrets(Room room) {
        room.game().ifPresent(game ->
                game.activePlayers().forEach(id -> secret(game, id)));
    }

    public void secret(Game game, PlayerId viewer) {
        publisher.toPlayer(
                viewer,
                ServerMessage.of(
                        ServerMessage.Type.SECRET, assembler.toSecretView(game, viewer)));
    }

    public void lobby() {
        publisher.toLobby(ServerMessage.of(
                ServerMessage.Type.ROOM_LIST,
                rooms.findAll().stream().map(assembler::toSummary).toList()));
    }

    public void error(PlayerId target, String reason) {
        publisher.toPlayer(target, ServerMessage.error(reason));
    }

    public void closed(RoomId roomId, String reason) {
        publisher.toRoom(
                roomId,
                ServerMessage.of(
                        ServerMessage.Type.CLOSED, new ServerMessage.ErrorPayload(reason)));
    }
}
