package com.liargame.application.view;

/** 대화 한 줄. authorId 가 null 이면 서버 안내임. */
public record ChatView(
        String id, String kind, String authorId, String authorName, String text, long at) {
}
