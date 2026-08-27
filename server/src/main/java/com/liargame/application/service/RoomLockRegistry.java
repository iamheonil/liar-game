package com.liargame.application.service;

import com.liargame.domain.room.RoomId;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/**
 * 방 단위 직렬화 잠금.
 *
 * <p>한 방의 상태를 건드리는 경로가 셋이라(사용자 요청, 단계 타이머, 접속 끊김 처리) 서로 다른
 * 스레드에서 동시에 들어옴. 방 하나를 한 번에 한 스레드만 만지게 해 두면 도메인 코드는 동시성을
 * 전혀 신경 쓰지 않아도 됨.
 *
 * <p>잠금 범위가 항상 방 하나로 끝나므로 교착이 생길 수 없음.
 */
@Component
public class RoomLockRegistry {

    private final ConcurrentMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public void run(RoomId roomId, Runnable action) {
        call(roomId, () -> {
            action.run();
            return null;
        });
    }

    public <T> T call(RoomId roomId, Supplier<T> action) {
        ReentrantLock lock = locks.computeIfAbsent(roomId.value(), key -> new ReentrantLock());
        lock.lock();
        try {
            return action.get();
        } finally {
            lock.unlock();
        }
    }

    /** 방이 사라질 때 호출. 잠금을 잡고 있는 스레드가 있어도 그쪽은 정상 종료됨. */
    public void release(RoomId roomId) {
        locks.remove(roomId.value());
    }
}
