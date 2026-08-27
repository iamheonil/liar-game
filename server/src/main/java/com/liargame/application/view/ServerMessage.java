package com.liargame.application.view;

/**
 * 클라이언트로 나가는 모든 메시지의 공통 봉투.
 *
 * <p>타입 문자열 하나로 클라이언트가 분기하므로, 새 메시지를 추가해도 기존 처리기를 건드릴 필요가
 * 없음.
 */
public record ServerMessage(Type type, Object payload) {

    public enum Type {
        /** 방 전체 상태 스냅샷. 변경이 생길 때마다 통째로 다시 보냄. */
        ROOM_STATE,
        /** 새로 추가된 대화 한 줄. */
        CHAT,
        /** 입장·재접속 시 한 번 내려 주는 대화 기록 전체. */
        CHAT_HISTORY,
        /** 본인에게만 보이는 제시어 정보. */
        SECRET,
        /** 방 목록. */
        ROOM_LIST,
        /** 요청을 처리하지 못한 이유. 요청자에게만 감. */
        ERROR,
        /** 방이 사라졌거나 강제로 나가야 할 때. */
        CLOSED
    }

    public static ServerMessage of(Type type, Object payload) {
        return new ServerMessage(type, payload);
    }

    public static ServerMessage error(String reason) {
        return new ServerMessage(Type.ERROR, new ErrorPayload(reason));
    }

    public record ErrorPayload(String reason) {
    }
}
