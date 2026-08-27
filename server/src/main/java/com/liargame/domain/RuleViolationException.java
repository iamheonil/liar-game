package com.liargame.domain;

/**
 * 규칙상 지금 할 수 없는 행동을 시도했을 때 발생함.
 *
 * <p>서버 결함이 아니라 사용자 입력 문제이므로, 상위 계층은 이 예외를 요청자에게만 안내 메시지로
 * 돌려주고 방과 게임 상태는 그대로 유지해야 함. 방 규칙과 게임 규칙이 같은 성격의 위반이라
 * 하나의 타입으로 다룸.
 */
public class RuleViolationException extends RuntimeException {

    public RuleViolationException(String message) {
        super(message);
    }
}
