package com.liargame.infrastructure.repository;

import com.liargame.application.port.RoomRepository;
import com.liargame.domain.room.Room;
import com.liargame.domain.room.RoomId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Repository;

/**
 * 프로세스 메모리에 방을 보관함.
 *
 * <p>이 게임은 방이 끝나면 남길 것이 없고 서버도 한 대만 띄우므로 데이터베이스가 필요 없음. 서버를
 * 여러 대로 늘려야 할 때 이 클래스만 교체하면 되도록 {@link RoomRepository} 뒤에 숨겨 둠.
 *
 * <p>맵 자체는 동시 접근에 안전하지만 {@link Room} 내부 상태의 직렬화는 상위 계층의 방 단위 잠금이
 * 책임짐.
 */
@Repository
public class InMemoryRoomRepository implements RoomRepository {

    private final ConcurrentMap<String, Room> rooms = new ConcurrentHashMap<>();

    @Override
    public Room save(Room room) {
        rooms.put(room.id().value(), room);
        return room;
    }

    @Override
    public Optional<Room> findById(RoomId roomId) {
        return Optional.ofNullable(rooms.get(roomId.value()));
    }

    @Override
    public List<Room> findAll() {
        return rooms.values().stream()
                .sorted(Comparator.comparing(Room::createdAt).reversed())
                .toList();
    }

    @Override
    public void delete(RoomId roomId) {
        rooms.remove(roomId.value());
    }
}
