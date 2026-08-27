package com.liargame.application.service;

import com.liargame.application.port.RoomRepository;
import com.liargame.application.view.JoinTicketView;
import com.liargame.application.view.RoomSummaryView;
import com.liargame.domain.RuleViolationException;
import com.liargame.domain.player.Nickname;
import com.liargame.domain.player.Player;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.Room;
import com.liargame.domain.room.RoomId;
import com.liargame.domain.room.RoomStatus;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * 방의 생명주기를 담당함. 게임 진행 자체는 {@link GameFlowService} 가 맡음.
 *
 * <p>여기서 다루는 상태 변경은 모두 방 단위 잠금 안에서 이뤄지며, 변경 직후 방 참가자와 로비에
 * 갱신을 알림.
 */
@Service
public class RoomService {

    private final RoomRepository rooms;
    private final RoomLockRegistry locks;
    private final RoomBroadcaster broadcaster;
    private final RoomViewAssembler assembler;
    private final Clock clock;

    public RoomService(
            RoomRepository rooms,
            RoomLockRegistry locks,
            RoomBroadcaster broadcaster,
            RoomViewAssembler assembler,
            Clock clock) {
        this.rooms = rooms;
        this.locks = locks;
        this.broadcaster = broadcaster;
        this.assembler = assembler;
        this.clock = clock;
    }

    public List<RoomSummaryView> listRooms() {
        return rooms.findAll().stream().map(assembler::toSummary).toList();
    }

    public JoinTicketView createRoom(String rawNickname, String rawTitle) {
        Player host = Player.join(Nickname.of(rawNickname));
        Room room = Room.open(rawTitle, host, clock.instant());
        rooms.save(room);
        broadcaster.lobby();
        return new JoinTicketView(
                room.id().value(), room.title(), host.id().value(), host.nickname().value());
    }

    public JoinTicketView joinRoom(String roomCode, String rawNickname) {
        RoomId roomId = RoomId.of(roomCode);
        Nickname nickname = Nickname.of(rawNickname);
        JoinTicketView ticket = locks.call(roomId, () -> {
            Room room = require(roomId);
            Player player = Player.join(nickname);
            room.join(player);
            broadcaster.state(room);
            return new JoinTicketView(
                    room.id().value(), room.title(), player.id().value(), nickname.value());
        });
        broadcaster.lobby();
        return ticket;
    }

    /**
     * 대기실에서 스스로 나감.
     *
     * <p>게임 진행 중에는 나갈 수 없다는 규칙에 따라 진행 중이면 거절함. 브라우저를 강제로 닫은
     * 경우는 접속 끊김으로 분류되어 {@link PlayerSessionService} 가 처리함.
     */
    public void leaveRoom(RoomId roomId, PlayerId playerId) {
        locks.run(roomId, () -> {
            Room room = require(roomId);
            if (room.status() == RoomStatus.PLAYING) {
                throw new RuleViolationException("게임이 끝나기 전에는 나갈 수 없음");
            }
            room.find(playerId).ifPresent(player -> {
                room.remove(playerId);
                room.announce("%s 님이 나갔습니다".formatted(player.nickname().value()),
                        clock.instant());
            });
            if (room.isEmpty()) {
                deleteRoom(roomId);
            } else {
                broadcaster.state(room);
            }
        });
        broadcaster.lobby();
    }

    public void changeSettings(RoomId roomId, PlayerId requester, int totalRounds) {
        locks.run(roomId, () -> {
            Room room = require(roomId);
            room.changeSettings(requester, totalRounds);
            broadcaster.state(room);
        });
        broadcaster.lobby();
    }

    /** 접속이 끊긴 채 유예 시간까지 지난 사람을 명단에서 지움. */
    public void purge(Room room, PlayerId playerId) {
        room.find(playerId).ifPresent(player -> {
            room.remove(playerId);
            room.announce("%s 님의 연결이 끊겼습니다".formatted(player.nickname().value()),
                    clock.instant());
        });
    }

    public void deleteRoom(RoomId roomId) {
        rooms.delete(roomId);
        locks.release(roomId);
        broadcaster.lobby();
    }

    public Optional<Room> find(RoomId roomId) {
        return rooms.findById(roomId);
    }

    public Room require(RoomId roomId) {
        return rooms.findById(roomId)
                .orElseThrow(() -> new RuleViolationException("존재하지 않는 방임"));
    }
}
