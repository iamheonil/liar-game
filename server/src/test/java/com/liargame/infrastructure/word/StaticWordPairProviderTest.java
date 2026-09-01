package com.liargame.infrastructure.word;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.liargame.domain.word.WordPair;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** 실제 사전을 그대로 읽어, 같은 제시어가 금방 다시 나오지 않는지 확인함. */
class StaticWordPairProviderTest {

    private StaticWordPairProvider provider() {
        return new StaticWordPairProvider(
                new ObjectMapper(), new ClassPathResource("words/words.json"));
    }

    @Test
    @DisplayName("한 쌍은 같은 범주의 서로 다른 두 단어다")
    void pairsAreDistinctWithinOneCategory() {
        StaticWordPairProvider provider = provider();

        for (int i = 0; i < 200; i++) {
            WordPair pair = provider.next();
            assertThat(pair.citizenWord().category()).isEqualTo(pair.liarWord().category());
            assertThat(pair.citizenWord().text()).isNotEqualTo(pair.liarWord().text());
        }
    }

    @Test
    @DisplayName("연달아 뽑아도 같은 범주가 곧바로 반복되지 않는다")
    void avoidsRepeatingCategoryImmediately() {
        StaticWordPairProvider provider = provider();
        List<String> categories = new ArrayList<>();

        for (int i = 0; i < 8; i++) {
            categories.add(provider.next().category());
        }

        assertThat(categories).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("최근에 쓴 단어는 한동안 다시 나오지 않는다")
    void avoidsRepeatingWordsWhileTheyAreRecent() {
        StaticWordPairProvider provider = provider();
        Set<String> seen = new HashSet<>();

        // 단어 회피 창(60개)을 넘지 않는 범위. 여기서 겹치면 회피가 동작하지 않는 것임
        for (int i = 0; i < 25; i++) {
            WordPair pair = provider.next();
            assertThat(seen.add(pair.citizenWord().text())).isTrue();
            assertThat(seen.add(pair.liarWord().text())).isTrue();
        }
    }

    @Test
    @DisplayName("사전을 다 소진해도 멈추지 않고 계속 뽑는다")
    void keepsWorkingAfterExhaustingTheDictionary() {
        StaticWordPairProvider provider = provider();

        for (int i = 0; i < 2000; i++) {
            assertThat(provider.next()).isNotNull();
        }
    }
}
