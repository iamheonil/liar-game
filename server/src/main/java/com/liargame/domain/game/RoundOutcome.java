package com.liargame.domain.game;

import com.liargame.domain.player.PlayerId;
import java.util.Map;

/**
 * 라운드 종료 시점에 확정되는 결과 스냅샷.
 *
 * <p>결과 화면과 최종 집계에 그대로 쓰이며, 이 시점에 제시어와 라이어 정체가 처음 공개됨.
 *
 * @param ending 어떻게 끝났는지. 같은 승패라도 경위가 다르므로 따로 남김
 */
public record RoundOutcome(
        int roundNumber,
        String category,
        String citizenWord,
        String liarWord,
        PlayerId liarId,
        PlayerId accusedId,
        boolean liarCaught,
        String liarGuess,
        boolean liarGuessCorrect,
        RoundEnding ending,
        Winner winner,
        Map<PlayerId, Integer> awardedPoints) {
}
