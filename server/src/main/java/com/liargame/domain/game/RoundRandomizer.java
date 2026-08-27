package com.liargame.domain.game;

import com.liargame.domain.player.PlayerId;
import java.util.List;

/**
 * 라운드 시작 시 필요한 무작위 배정 정책.
 *
 * <p>"누가 라이어인가"와 "누구부터 말하는가"는 함께 바뀌는 하나의 관심사라 한 인터페이스로 묶음.
 * 테스트에서는 고정 순서를 반환하는 구현으로 갈아끼워 결정적으로 검증함.
 */
public interface RoundRandomizer {

    PlayerId pickLiar(List<PlayerId> candidates);

    List<PlayerId> shuffleTurnOrder(List<PlayerId> candidates);
}
