package com.liargame.application.view;

import java.util.List;
import java.util.Map;

/**
 * 진행 중인 게임의 공개 상태.
 *
 * <p>여기에는 라이어 정체와 제시어가 절대 들어가지 않음. 그 정보는 라운드가 끝난 뒤
 * {@link #lastRound()} 로만 공개되고, 진행 중에는 {@link SecretView} 로 본인 것만 전달됨.
 *
 * @param phaseEndsAt 현재 단계 종료 시각(epoch ms). 클라이언트가 이 값으로 카운트다운을 그림
 * @param votes 투표자 아이디 → 지목 대상 아이디
 * @param finalVotes 투표자 아이디 → 처형 찬성 여부
 */
public record GameView(
        String phase,
        int round,
        int totalRounds,
        Long phaseEndsAt,
        List<String> turnOrder,
        String turnPlayerId,
        List<HintView> hints,
        Map<String, String> votes,
        Map<String, Boolean> finalVotes,
        String accusedId,
        List<String> skipVotes,
        int skipThreshold,
        RoundResultView lastRound,
        GameResultView finalResult) {
}
