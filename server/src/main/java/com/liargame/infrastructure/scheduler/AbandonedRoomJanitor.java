package com.liargame.infrastructure.scheduler;

import com.liargame.application.port.RoomRepository;
import com.liargame.application.service.RoomLockRegistry;
import com.liargame.application.service.RoomService;
import com.liargame.domain.room.Room;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 아무도 접속해 있지 않은 방을 정리함.
 *
 * <p>방을 만들어 놓고 창을 닫아 버리거나, 게임 도중 전원이 사라지는 경우가 실제로 자주 생김.
 * 이런 방이 목록에 남아 있으면 다른 사람이 헛걸음을 하므로 주기적으로 걷어냄.
 *
 * <p>일시적인 끊김과 구분하기 위해 "비어 있음"이 일정 시간 이어질 때만 지움. 판정에 필요한 시각은
 * 방에 저장하지 않고 이 클래스가 따로 들고 있어, 도메인이 정리 정책을 알 필요가 없음.
 */
@Component
public class AbandonedRoomJanitor {

    private static final Duration EMPTY_TOLERANCE = Duration.ofSeconds(45);
    private static final long SWEEP_INTERVAL_MILLIS = 15_000L;

    private static final Logger log = LoggerFactory.getLogger(AbandonedRoomJanitor.class);

    private final RoomRepository rooms;
    private final RoomService roomService;
    private final RoomLockRegistry locks;
    private final Clock clock;
    private final ConcurrentMap<String, Instant> emptySince = new ConcurrentHashMap<>();

    public AbandonedRoomJanitor(
            RoomRepository rooms, RoomService roomService, RoomLockRegistry locks, Clock clock) {
        this.rooms = rooms;
        this.roomService = roomService;
        this.locks = locks;
        this.clock = clock;
    }

    @Scheduled(fixedDelay = SWEEP_INTERVAL_MILLIS)
    public void sweep() {
        Instant now = clock.instant();
        List<Room> current = rooms.findAll();
        Set<String> alive = new HashSet<>();

        for (Room room : current) {
            String key = room.id().value();
            alive.add(key);
            if (!room.hasNoConnectedPlayer()) {
                emptySince.remove(key);
                continue;
            }
            Instant since = emptySince.computeIfAbsent(key, ignored -> now);
            if (Duration.between(since, now).compareTo(EMPTY_TOLERANCE) >= 0) {
                locks.run(room.id(), () -> roomService.deleteRoom(room.id()));
                emptySince.remove(key);
                log.info("빈 방 정리 roomId={}", key);
            }
        }
        emptySince.keySet().retainAll(alive);
    }
}
