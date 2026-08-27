package com.liargame.infrastructure.scheduler;

import com.liargame.application.port.DelayedExecutor;
import jakarta.annotation.PreDestroy;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 단일 스케줄러 스레드풀 위에서 동작하는 키 기반 지연 실행기.
 *
 * <p>같은 키로 다시 예약하면 이전 예약을 취소하므로, 단계가 바뀔 때마다 별도의 정리 코드를 쓰지
 * 않아도 예약이 하나로 유지됨.
 *
 * <p>작업 안에서 예외가 나면 스케줄러 스레드가 조용히 죽어 이후 모든 타이머가 멈추는 사고가 잘
 * 알려져 있음. 그래서 모든 작업을 예외 삼킴 래퍼로 감쌈.
 */
@Component
public class ScheduledDelayedExecutor implements DelayedExecutor {

    private static final Logger log = LoggerFactory.getLogger(ScheduledDelayedExecutor.class);

    private final ScheduledExecutorService scheduler =
            Executors.newScheduledThreadPool(2, Thread.ofPlatform().name("phase-", 0).factory());
    private final ConcurrentMap<String, ScheduledFuture<?>> pending = new ConcurrentHashMap<>();
    private final Clock clock;

    public ScheduledDelayedExecutor(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void schedule(String key, Instant runAt, Runnable task) {
        long delayMillis = Math.max(0, Duration.between(clock.instant(), runAt).toMillis());
        ScheduledFuture<?> future = scheduler.schedule(
                () -> runGuarded(key, task), delayMillis, TimeUnit.MILLISECONDS);
        ScheduledFuture<?> previous = pending.put(key, future);
        if (previous != null) {
            previous.cancel(false);
        }
    }

    @Override
    public void cancel(String key) {
        ScheduledFuture<?> future = pending.remove(key);
        if (future != null) {
            future.cancel(false);
        }
    }

    private void runGuarded(String key, Runnable task) {
        pending.remove(key);
        try {
            task.run();
        } catch (RuntimeException e) {
            log.error("예약 작업 실패 key={}", key, e);
        }
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
