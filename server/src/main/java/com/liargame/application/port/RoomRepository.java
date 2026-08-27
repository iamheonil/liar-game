package com.liargame.application.port;

import com.liargame.domain.room.Room;
import com.liargame.domain.room.RoomId;
import java.util.List;
import java.util.Optional;

/**
 * 방 저장소.
 *
 * <p>지금은 인메모리 구현 하나뿐이지만, 서버를 여러 대로 늘리게 되면 이 인터페이스만 Redis 등으로
 * 갈아끼우면 되도록 애플리케이션 계층은 구현체를 알지 못하게 둠.
 */
public interface RoomRepository {

    Room save(Room room);

    Optional<Room> findById(RoomId roomId);

    /** 방 목록 화면에 보여 줄 전체 방. 최근에 만들어진 방이 앞에 옴. */
    List<Room> findAll();

    void delete(RoomId roomId);
}
