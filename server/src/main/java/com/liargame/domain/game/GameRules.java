package com.liargame.domain.game;

import java.time.Duration;

/**
 * 게임의 시간·점수 상수 묶음.
 *
 * <p>도메인 로직에 숫자를 흩뿌리지 않기 위해 한곳에 모음. 테스트에서는 짧은 시간으로 바꿔
 * 주입하면 상태 전이를 실시간 대기 없이 검증할 수 있음.
 *
 * @param maxVoteAttempts 한 라운드에서 허용하는 지목 투표 시도 횟수. 최후 투표가 부결되면
 *     재투표하는데, 상한이 없으면 라운드가 끝나지 않을 수 있어 이 값으로 끊음.
 */
public record GameRules(
        Duration roleReveal,
        Duration hintPerPlayer,
        Duration discussion,
        Duration vote,
        Duration defense,
        Duration finalVote,
        Duration liarGuess,
        Duration roundResult,
        Duration disconnectGrace,
        int maxVoteAttempts,
        int citizenWinPoint,
        int liarWinPoint) {

    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 8;
    public static final int MAX_HINT_LENGTH = 30;
    public static final int MAX_GUESS_LENGTH = 30;

    public static GameRules defaults() {
        return new GameRules(
                Duration.ofSeconds(6),
                Duration.ofSeconds(15),
                Duration.ofSeconds(180),
                Duration.ofSeconds(30),
                Duration.ofSeconds(20),
                Duration.ofSeconds(20),
                Duration.ofSeconds(30),
                Duration.ofSeconds(8),
                Duration.ofSeconds(30),
                2,
                1,
                2);
    }

    public Duration durationOf(GamePhase phase) {
        return switch (phase) {
            case ROLE_REVEAL -> roleReveal;
            case HINT -> hintPerPlayer;
            case DISCUSSION -> discussion;
            case VOTE -> vote;
            case DEFENSE -> defense;
            case FINAL_VOTE -> finalVote;
            case LIAR_GUESS -> liarGuess;
            case ROUND_RESULT -> roundResult;
            case GAME_RESULT -> Duration.ZERO;
        };
    }
}
