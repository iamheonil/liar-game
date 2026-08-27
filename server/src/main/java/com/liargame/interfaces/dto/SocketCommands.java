package com.liargame.interfaces.dto;

/**
 * WebSocket 으로 들어오는 명령 본문 모음.
 *
 * <p>모두 필드 한둘짜리라 파일을 흩뿌리는 대신 한곳에 묶음. 어떤 명령이 있는지 한눈에 보이는 쪽이
 * 프로토콜 파악에 유리함.
 */
public final class SocketCommands {

    private SocketCommands() {
    }

    public record Chat(String text) {
    }

    public record Hint(String text) {
    }

    public record Vote(String targetId) {
    }

    public record FinalVote(boolean approve) {
    }

    public record Guess(String word) {
    }

    public record Settings(int totalRounds) {
    }
}
