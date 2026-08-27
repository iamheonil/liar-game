package com.liargame.infrastructure.word;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.liargame.domain.word.Word;
import com.liargame.domain.word.WordPair;
import com.liargame.domain.word.WordPairProvider;
import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/**
 * 클래스패스의 JSON 사전에서 제시어 쌍을 뽑음.
 *
 * <p>범주를 하나 고른 뒤 그 안에서 서로 다른 두 단어를 뽑음. 라이어가 "사슴"을 받았는데 정답이
 * "호랑이"인 것처럼 같은 결의 단어를 줘야, 라이어가 자기 정체를 눈치채지 못한 채 힌트를 낼 수 있음.
 *
 * <p>사전은 시작 시 한 번만 읽고 검증함. 단어가 둘 미만인 범주가 있으면 게임 도중이 아니라 기동
 * 시점에 실패하는 편이 낫기 때문임.
 */
@Component
public class StaticWordPairProvider implements WordPairProvider {

    private static final int MIN_WORDS_PER_CATEGORY = 2;

    private final List<WordDictionary.Category> categories;
    private final SecureRandom random = new SecureRandom();

    public StaticWordPairProvider(
            ObjectMapper objectMapper,
            @Value("classpath:words/words.json") Resource dictionaryResource) {
        this.categories = load(objectMapper, dictionaryResource);
    }

    private static List<WordDictionary.Category> load(ObjectMapper mapper, Resource resource) {
        try (InputStream input = resource.getInputStream()) {
            WordDictionary dictionary = mapper.readValue(input, WordDictionary.class);
            List<WordDictionary.Category> loaded = dictionary.categories();
            if (loaded == null || loaded.isEmpty()) {
                throw new IllegalStateException("제시어 사전이 비어 있음");
            }
            loaded.stream()
                    .filter(category -> category.words().size() < MIN_WORDS_PER_CATEGORY)
                    .findAny()
                    .ifPresent(category -> {
                        throw new IllegalStateException(
                                "범주 '%s' 에 단어가 %d개 미만임"
                                        .formatted(category.name(), MIN_WORDS_PER_CATEGORY));
                    });
            return List.copyOf(loaded);
        } catch (IOException e) {
            throw new IllegalStateException("제시어 사전을 읽지 못함", e);
        }
    }

    @Override
    public WordPair next() {
        WordDictionary.Category category = categories.get(random.nextInt(categories.size()));
        List<String> words = category.words();
        int citizenIndex = random.nextInt(words.size());
        int liarIndex = random.nextInt(words.size() - 1);
        if (liarIndex >= citizenIndex) {
            liarIndex++;
        }
        return new WordPair(
                new Word(category.name(), words.get(citizenIndex)),
                new Word(category.name(), words.get(liarIndex)));
    }
}
