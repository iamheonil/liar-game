package com.liargame.domain.room;

import static com.liargame.domain.game.GameFixtures.fixedWords;
import static com.liargame.domain.game.GameFixtures.liarAt;
import static com.liargame.domain.game.GameFixtures.rules;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.liargame.domain.RuleViolationException;
import com.liargame.domain.game.GameRules;
import com.liargame.domain.player.Nickname;
import com.liargame.domain.player.Player;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 방 참가자 관리와 권한 규칙을 검증함. */
class RoomTest {

    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

    private Player connected(String nickname) {
        Player player = Player.join(Nickname.of(nickname));
        player.markConnected();
        return player;
    }

    private Room roomWith(int extraPlayers) {
        Room room = Room.open("테스트방", connected("방장"), NOW);
        for (int index = 0; index < extraPlayers; index++) {
            room.join(connected("참가자" + index));
        }
        return room;
    }

    @Test
    @DisplayName("제목을 비워 두면 방장 닉네임으로 채운다")
    void fallsBackToHostNameForTitle() {
        Room room = Room.open("   ", connected("헌일"), NOW);

        assertThat(room.title()).isEqualTo("헌일의 방");
    }

    @Test
    @DisplayName("정원을 넘으면 입장할 수 없다")
    void rejectsJoinWhenFull() {
        Room room = roomWith(GameRules.MAX_PLAYERS - 1);

        assertThat(room.playerCount()).isEqualTo(GameRules.MAX_PLAYERS);
        assertThatThrownBy(() -> room.join(connected("초과")))
                .isInstanceOf(RuleViolationException.class)
                .hasMessageContaining("정원");
    }

    @Test
    @DisplayName("게임이 진행 중인 방에는 들어올 수 없다")
    void rejectsJoinWhilePlaying() {
        Room room = roomWith(2);
        room.startGame(room.hostId(), rules(), fixedWords(), liarAt(0), NOW);

        assertThat(room.status()).isEqualTo(RoomStatus.PLAYING);
        assertThatThrownBy(() -> room.join(connected("지각")))
                .isInstanceOf(RuleViolationException.class);
    }

    @Test
    @DisplayName("방장이 나가면 남은 사람에게 권한이 넘어간다")
    void handsOverHostOnLeave() {
        Room room = roomWith(2);
        List<Player> players = new ArrayList<>(room.players());

        room.remove(room.hostId());

        assertThat(room.hostId()).isEqualTo(players.get(1).id());
    }

    @Test
    @DisplayName("방장이 아니면 설정을 바꿀 수 없다")
    void onlyHostChangesSettings() {
        Room room = roomWith(1);
        Player guest = room.players().get(1);

        assertThatThrownBy(() -> room.changeSettings(guest.id(), 5))
                .isInstanceOf(RuleViolationException.class);

        room.changeSettings(room.hostId(), 5);
        assertThat(room.settings().totalRounds()).isEqualTo(5);
    }

    @Test
    @DisplayName("허용되지 않은 라운드 수는 거부한다")
    void rejectsUnsupportedRoundCount() {
        Room room = roomWith(1);

        assertThatThrownBy(() -> room.changeSettings(room.hostId(), 4))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("접속하지 않은 사람은 게임 참가자에서 빠진다")
    void excludesDisconnectedFromGame() {
        Room room = roomWith(2);
        Player sleeper = room.players().get(2);
        room.markDisconnected(sleeper.id());

        var game = room.startGame(room.hostId(), rules(), fixedWords(), liarAt(0), NOW);

        assertThat(game.participants()).hasSize(2).doesNotContain(sleeper.id());
    }

    @Test
    @DisplayName("최소 인원에 못 미치면 시작할 수 없다")
    void rejectsStartBelowMinimum() {
        Room room = roomWith(0);

        assertThatThrownBy(() ->
                        room.startGame(room.hostId(), rules(), fixedWords(), liarAt(0), NOW))
                .isInstanceOf(RuleViolationException.class);
    }

    @Test
    @DisplayName("힌트 단계에서는 채팅이 막힌다")
    void blocksChatDuringHintPhase() {
        Room room = roomWith(2);
        var game = room.startGame(room.hostId(), rules(), fixedWords(), liarAt(0), NOW);
        game.onTimeout(NOW);

        assertThatThrownBy(() -> room.speak(room.hostId(), "안녕", NOW))
                .isInstanceOf(RuleViolationException.class)
                .hasMessageContaining("발언할 수 없는");
    }

    @Test
    @DisplayName("대기실에서는 자유롭게 대화할 수 있다")
    void allowsChatInLobby() {
        Room room = roomWith(1);

        ChatMessage message = room.speak(room.hostId(), "다들 준비됐나요", NOW);

        assertThat(message.kind()).isEqualTo(ChatMessage.Kind.CHAT);
        assertThat(room.chatHistory()).containsExactly(message);
    }
}
