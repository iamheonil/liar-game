package com.liargame.domain.room;

/** 방 목록과 입장 가능 여부 판단에 쓰이는 방의 큰 상태. */
public enum RoomStatus {

    /** 대기실. 입장·설정 변경·게임 시작이 가능함. */
    WAITING,

    /** 게임 진행 중. 새로운 사람은 들어올 수 없음. */
    PLAYING,

    /** 게임이 끝나고 결과를 보여 주는 중. 곧 대기실로 돌아감. */
    RESULT
}
