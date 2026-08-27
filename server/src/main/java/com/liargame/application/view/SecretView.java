package com.liargame.application.view;

import java.util.List;

/**
 * 본인에게만 전송되는 라운드 정보.
 *
 * <p>라이어에게도 같은 모양으로 (다른) 단어가 나가므로, 이 메시지만으로는 자신이 라이어인지 알 수
 * 없음. 이것이 이 게임의 핵심이라 서버는 절대 역할을 내려보내지 않음.
 */
public record SecretView(int round, String category, String word, List<String> turnOrder) {
}
