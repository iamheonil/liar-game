package com.liargame.config;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * STOMP over WebSocket 설정.
 *
 * <p>클라이언트는 {@code /ws?roomId=...&playerId=...} 로 접속함. playerId 는 방에 입장할 때 서버가
 * 발급한 추측 불가능한 값이며, 이것이 곧 본인 증명 수단임. 별도의 로그인이 없는 파티 게임이라
 * 이 정도가 적정한 수준이고, 대신 이 값은 개인 채널 구독과 행동 주체 판별에 모두 쓰임.
 *
 * <p>방 목록 화면처럼 아직 방에 속하지 않은 접속도 허용해야 하므로, playerId 가 없으면 익명
 * 식별자를 부여하고 방 관련 이벤트는 발생시키지 않음.
 */
@Configuration
@EnableWebSocketMessageBroker
@EnableConfigurationProperties(WebSocketProperties.class)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    public static final String ATTR_ROOM_ID = "roomId";
    public static final String ATTR_PLAYER_ID = "playerId";

    private final WebSocketProperties properties;

    public WebSocketConfig(WebSocketProperties properties) {
        this.properties = properties;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(properties.originPatterns())
                .addInterceptors(new QueryParameterHandshakeInterceptor())
                .setHandshakeHandler(new PlayerPrincipalHandshakeHandler());
    }

    /** 핸드셰이크 쿼리스트링의 식별자를 세션 속성으로 옮겨, 접속·종료 이벤트에서 쓸 수 있게 함. */
    private static class QueryParameterHandshakeInterceptor implements HandshakeInterceptor {

        @Override
        public boolean beforeHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler handler,
                Map<String, Object> attributes) {
            var params = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
            putIfPresent(attributes, ATTR_ROOM_ID, params.getFirst(ATTR_ROOM_ID));
            putIfPresent(attributes, ATTR_PLAYER_ID, params.getFirst(ATTR_PLAYER_ID));
            return true;
        }

        private void putIfPresent(Map<String, Object> attributes, String key, String value) {
            if (value != null && !value.isBlank()) {
                attributes.put(key, value);
            }
        }

        @Override
        public void afterHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler handler,
                Exception exception) {
            // 후처리 없음
        }
    }

    /** 개인 채널({@code /user/queue/private}) 라우팅에 쓰이는 접속 주체를 결정함. */
    private static class PlayerPrincipalHandshakeHandler extends DefaultHandshakeHandler {

        @Override
        protected Principal determineUser(
                ServerHttpRequest request, WebSocketHandler handler, Map<String, Object> attributes) {
            Object playerId = attributes.get(ATTR_PLAYER_ID);
            String name = playerId instanceof String value
                    ? value
                    : "anonymous-" + UUID.randomUUID();
            return () -> name;
        }
    }
}
