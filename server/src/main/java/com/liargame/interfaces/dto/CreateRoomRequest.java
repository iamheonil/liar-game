package com.liargame.interfaces.dto;

/** 방 만들기 요청. 제목이 비어 있으면 서버가 "닉네임의 방" 으로 채움. */
public record CreateRoomRequest(String nickname, String title) {
}
