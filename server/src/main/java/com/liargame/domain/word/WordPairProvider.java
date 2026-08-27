package com.liargame.domain.word;

/**
 * 제시어 쌍 공급 계약.
 *
 * <p>도메인은 "어디서 단어가 오는지"를 알 필요가 없음. 정적 JSON이든 DB든 외부 API든
 * 이 인터페이스만 구현하면 교체 가능함(DIP).
 */
@FunctionalInterface
public interface WordPairProvider {

    WordPair next();
}
