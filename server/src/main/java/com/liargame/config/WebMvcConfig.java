package com.liargame.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 개발 중 Vite 개발 서버(다른 포트)에서 오는 REST 요청을 허용함.
 *
 * <p>배포 형상에서는 nginx 가 정적 파일과 API 를 같은 출처로 묶으므로 이 설정이 쓰이지 않음.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final WebSocketProperties properties;

    public WebMvcConfig(WebSocketProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(properties.originPatterns())
                .allowedMethods("GET", "POST", "DELETE")
                .allowCredentials(true);
    }
}
