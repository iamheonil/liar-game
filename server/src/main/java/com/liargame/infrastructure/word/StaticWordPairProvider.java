package com.liargame.infrastructure.word;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.liargame.domain.word.Word;
import com.liargame.domain.word.WordPair;
import com.liargame.domain.word.WordPairProvider;
import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
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
 * <p>매번 완전 무작위로 뽑으면 사전이 아무리 커도 같은 단어가 금방 다시 나옴. 사람은 이것을
 * "또 나왔다"로 기억하기 때문에 실제 확률보다 훨씬 자주 반복된다고 느낌. 그래서 최근에 쓴 것을
 * 잠시 후보에서 빼 둠. 범주와 단어를 따로 기억하는데, 같은 범주가 연달아 나오는 것도 단어가
 * 겹치는 것만큼이나 지루하기 때문임.
 *
 * <p>사전은 시작 시 한 번만 읽고 검증함. 단어가 둘 미만인 범주가 있으면 게임 도중이 아니라 기동
 * 시점에 실패하는 편이 낫기 때문임.
 */
@Component
public class StaticWordPairProvider implements WordPairProvider {

    private static final int MIN_WORDS_PER_CATEGORY = 2;

    /**
     * 최근 이만큼의 범주는 다시 고르지 않음.
     *
     * <p>전체 범주 수보다 충분히 작아야 함. 너무 크게 잡으면 고를 수 있는 범주가 남지 않아 회피가
     * 의미를 잃음.
     */
    private static final int CATEGORY_COOLDOWN = 8;

    /** 최근 이만큼의 단어는 다시 고르지 않음. 한 범주의 단어 수보다 작아야 뽑을 것이 남음. */
    private static final int WORD_COOLDOWN = 60;

    private final List<WordDictionary.Category> categories;
    private final SecureRandom random = new SecureRandom();

    private final Deque<String> recentCategories = new ArrayDeque<>();
    private final Deque<String> recentWords = new ArrayDeque<>();

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
    public synchronized WordPair next() {
        WordDictionary.Category category = pickCategory();
        List<String> pool = availableWords(category);

        String citizenWord = pool.remove(random.nextInt(pool.size()));
        String liarWord = pool.get(random.nextInt(pool.size()));

        remember(recentCategories, category.name(), CATEGORY_COOLDOWN);
        remember(recentWords, citizenWord, WORD_COOLDOWN);
        remember(recentWords, liarWord, WORD_COOLDOWN);

        return new WordPair(
                new Word(category.name(), citizenWord), new Word(category.name(), liarWord));
    }

    /** 최근에 쓰지 않은 범주 중에서 고름. 남는 것이 없으면 회피를 포기하고 전체에서 고름. */
    private WordDictionary.Category pickCategory() {
        List<WordDictionary.Category> fresh = categories.stream()
                .filter(category -> !recentCategories.contains(category.name()))
                .toList();
        List<WordDictionary.Category> pool = fresh.isEmpty() ? categories : fresh;
        return pool.get(random.nextInt(pool.size()));
    }

    /**
     * 해당 범주에서 뽑을 수 있는 단어들.
     *
     * <p>최근에 쓴 단어를 걸러 내되, 그러고 나서 둘 미만이 남으면 한 쌍을 만들 수 없으므로 회피를
     * 포기하고 범주 전체를 씀. 사전이 작아도 게임이 멈추지 않게 하기 위한 안전장치임.
     */
    private List<String> availableWords(WordDictionary.Category category) {
        List<String> fresh = new ArrayList<>(category.words());
        fresh.removeAll(recentWords);
        return fresh.size() >= MIN_WORDS_PER_CATEGORY ? fresh : new ArrayList<>(category.words());
    }

    private static void remember(Deque<String> history, String value, int limit) {
        history.addLast(value);
        while (history.size() > limit) {
            history.removeFirst();
        }
    }
}
