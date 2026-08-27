package com.liargame.interfaces.dto;

/** REST 오류 응답. 사용자에게 그대로 보여 줄 수 있는 문장만 담음. */
public record ErrorResponse(String message) {
}
