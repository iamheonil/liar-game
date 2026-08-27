package com.liargame.config;

import java.util.Arrays;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 접속 허용 출처 설정.
 *
 * <p>배포 시에는 nginx 뒤에서 같은 출처로 동작하므로 값이 필요 없지만, 개발 중에는 Vite 개발
 * 서버가 다른 포트에서 뜨므로 그 주소를 열어 줘야 함.
 *
 * @param allowedOrigins 쉼표로 구분한 출처 목록. {@code *} 는 전체 허용
 */
@ConfigurationProperties(prefix = "app.cors")
public record WebSocketProperties(String allowedOrigins) {

    private static final String[] ALLOW_ALL = {"*"};

    public String[] originPatterns() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return ALLOW_ALL.clone();
        }
        String[] patterns = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);
        return patterns.length == 0 ? ALLOW_ALL.clone() : patterns;
    }
}
