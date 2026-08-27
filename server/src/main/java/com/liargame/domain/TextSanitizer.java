package com.liargame.domain;

/**
 * 사용자가 입력한 문자열을 화면에 올려도 안전한 형태로 다듬음.
 *
 * <p>닉네임과 채팅은 다른 사람 화면에 그대로 렌더링되므로, 눈에 보이지 않으면서 줄바꿈이나 글자
 * 방향을 바꿔 버리는 문자를 걸러 내야 함. 예를 들어 방향 재정의 문자를 닉네임에 넣으면 참가자
 * 목록 전체가 뒤집혀 보이게 만들 수 있음.
 */
public final class TextSanitizer {

    private TextSanitizer() {
    }

    /** 제어문자와 보이지 않는 서식 문자를 제거하고 앞뒤 공백을 다듬음. */
    public static String visibleOnly(String raw) {
        if (raw == null) {
            return "";
        }
        StringBuilder cleaned = new StringBuilder(raw.length());
        raw.codePoints().filter(TextSanitizer::isRenderable).forEach(cleaned::appendCodePoint);
        return cleaned.toString().trim();
    }

    /** 공백을 모두 없앤 형태. 제시어 정답 비교처럼 띄어쓰기 차이를 무시해야 할 때 씀. */
    public static String withoutWhitespace(String raw) {
        if (raw == null) {
            return "";
        }
        StringBuilder cleaned = new StringBuilder(raw.length());
        raw.codePoints()
                .filter(codePoint -> !Character.isWhitespace(codePoint))
                .forEach(cleaned::appendCodePoint);
        return cleaned.toString();
    }

    private static boolean isRenderable(int codePoint) {
        return !Character.isISOControl(codePoint) && !isInvisibleFormatting(codePoint);
    }

    /** 폭이 없거나 글자 방향을 조작하는 문자들. */
    private static boolean isInvisibleFormatting(int codePoint) {
        return (codePoint >= 0x200B && codePoint <= 0x200F)
                || (codePoint >= 0x2028 && codePoint <= 0x202E)
                || (codePoint >= 0x2066 && codePoint <= 0x2069)
                || codePoint == 0xFEFF;
    }
}
