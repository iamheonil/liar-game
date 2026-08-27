package com.liargame.domain.game;

/**
 * 한 라운드 안에서 순환하는 게임 단계.
 *
 * <p>각 단계는 제한 시간이 있고, 시간이 다 되거나 단계 완료 조건이 충족되면 다음 단계로 넘어감.
 * 채팅 허용 여부가 단계마다 다르므로 그 판단도 여기에 둠.
 */
public enum GamePhase {

    /** 제시어와 힌트 순서를 확인하는 시간. */
    ROLE_REVEAL(ChatPolicy.SILENT),

    /** 한 명씩 돌아가며 힌트를 제출. 발언 순서가 아닌 사람은 아무것도 할 수 없음. */
    HINT(ChatPolicy.SILENT),

    /** 자유토론. /스킵 으로 조기 종료 가능. */
    DISCUSSION(ChatPolicy.EVERYONE),

    /** 라이어로 의심되는 사람을 지목. */
    VOTE(ChatPolicy.EVERYONE),

    /** 최다 득표자의 최후 진술. 지목당한 본인만 발언 가능. */
    DEFENSE(ChatPolicy.ACCUSED_ONLY),

    /** 최후 진술을 듣고 처형 여부를 결정. */
    FINAL_VOTE(ChatPolicy.EVERYONE),

    /** 처형된 사람이 라이어였을 때 주어지는 제시어 맞히기 기회. */
    LIAR_GUESS(ChatPolicy.SILENT),

    /** 라운드 결과 공개. */
    ROUND_RESULT(ChatPolicy.EVERYONE),

    /** 게임 전체 결과 공개. 게임 종료 상태. */
    GAME_RESULT(ChatPolicy.EVERYONE);

    private enum ChatPolicy {
        SILENT,
        ACCUSED_ONLY,
        EVERYONE
    }

    private final ChatPolicy chatPolicy;

    GamePhase(ChatPolicy chatPolicy) {
        this.chatPolicy = chatPolicy;
    }

    /** 지목당한 사람이 없는 단계에서는 accused에 null을 넘기면 됨. */
    public boolean allowsChatFrom(Object speakerId, Object accusedId) {
        return switch (chatPolicy) {
            case EVERYONE -> true;
            case SILENT -> false;
            case ACCUSED_ONLY -> accusedId != null && accusedId.equals(speakerId);
        };
    }

    public boolean isTerminal() {
        return this == GAME_RESULT;
    }
}
