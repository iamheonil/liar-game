package com.liargame.domain.room;

import com.liargame.domain.player.PlayerId;
import java.time.Instant;
import java.util.UUID;

/**
 * 방 안에서 오간 한 줄.
 *
 * @param authorId 시스템 안내 메시지인 경우 null
 */
public record ChatMessage(
        String id, Kind kind, PlayerId authorId, String authorName, String text, Instant at) {

    public enum Kind {
        /** 플레이어가 입력한 일반 대화. */
        CHAT,
        /** 입퇴장·단계 전환 등 서버가 알리는 안내. */
        SYSTEM,
        /** 최후 진술처럼 강조해서 보여 줄 발언. */
        DEFENSE
    }

    public static final int MAX_LENGTH = 200;

    public static ChatMessage chat(PlayerId authorId, String authorName, String text, Instant at) {
        return new ChatMessage(newId(), Kind.CHAT, authorId, authorName, text, at);
    }

    public static ChatMessage defense(
            PlayerId authorId, String authorName, String text, Instant at) {
        return new ChatMessage(newId(), Kind.DEFENSE, authorId, authorName, text, at);
    }

    public static ChatMessage system(String text, Instant at) {
        return new ChatMessage(newId(), Kind.SYSTEM, null, null, text, at);
    }

    private static String newId() {
        return UUID.randomUUID().toString();
    }
}
