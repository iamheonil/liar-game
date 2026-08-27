package com.liargame.application.port;

import java.time.Instant;

/**
 * 키로 취소할 수 있는 지연 실행기.
 *
 * <p>단계 제한 시간과 재접속 유예 시간 모두 "예약해 두고 상황이 바뀌면 취소한다"는 같은 성격이라
 * 하나의 추상화로 다룸. 같은 키로 다시 예약하면 이전 예약은 자동으로 취소됨.
 */
public interface DelayedExecutor {

    void schedule(String key, Instant runAt, Runnable task);

    void cancel(String key);
}
