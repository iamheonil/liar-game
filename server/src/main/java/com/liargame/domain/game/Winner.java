package com.liargame.domain.game;

/** 라운드 승패. 라이어가 중도 이탈해 라운드가 성립하지 않으면 {@link #NONE}. */
public enum Winner {
    CITIZEN,
    LIAR,
    NONE
}
