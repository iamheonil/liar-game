package com.liargame.infrastructure.random;

import com.liargame.domain.game.RoundRandomizer;
import com.liargame.domain.player.PlayerId;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * 실제 게임에서 쓰는 무작위 배정.
 *
 * <p>누가 라이어인지는 게임의 전부라 예측 가능해서는 안 되므로 {@link SecureRandom} 을 씀. 라운드
 * 시작 때 두 번 호출되는 것이 전부라 비용은 무시할 수 있음.
 */
@Component
public class SecureRandomRoundRandomizer implements RoundRandomizer {

    private final SecureRandom random = new SecureRandom();

    @Override
    public PlayerId pickLiar(List<PlayerId> candidates) {
        return candidates.get(random.nextInt(candidates.size()));
    }

    @Override
    public List<PlayerId> shuffleTurnOrder(List<PlayerId> candidates) {
        List<PlayerId> shuffled = new ArrayList<>(candidates);
        Collections.shuffle(shuffled, random);
        return List.copyOf(shuffled);
    }
}
