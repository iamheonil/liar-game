package com.liargame.config;

import com.liargame.domain.game.GameRules;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 도메인이 필요로 하는 협력자를 스프링 빈으로 노출함.
 *
 * <p>시계를 빈으로 두는 이유는 테스트에서 고정 시각으로 바꿔 끼우기 위함이며, 규칙도 마찬가지로
 * 빈이라 나중에 방마다 다른 시간 설정을 주는 확장이 열려 있음.
 */
@Configuration
public class AppConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    public GameRules gameRules() {
        return GameRules.defaults();
    }
}
