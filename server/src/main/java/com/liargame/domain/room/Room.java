package com.liargame.domain.room;

import com.liargame.domain.RuleViolationException;
import com.liargame.domain.TextSanitizer;
import com.liargame.domain.game.Game;
import com.liargame.domain.game.GameRules;
import com.liargame.domain.game.RoundRandomizer;
import com.liargame.domain.player.Nickname;
import com.liargame.domain.player.Player;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.word.WordPairProvider;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 방 애그리거트. 참가자 명단·방장 권한·설정·채팅을 관리하고, 게임이 시작되면 {@link Game} 을 품음.
 *
 * <p>동시 접근 제어는 이 클래스가 하지 않음. 상위 계층이 방 단위 잠금으로 직렬화한 뒤 호출하는 것을
 * 전제로 하며, 그 덕분에 도메인 코드는 잠금 없이 단순하게 유지됨.
 */
public class Room {

    /** 화면에 보여 줄 최근 대화 보관량. 방이 오래 유지돼도 메모리가 늘지 않도록 상한을 둠. */
    private static final int CHAT_HISTORY_LIMIT = 200;

    private final RoomId id;
    private final Instant createdAt;
    private final Map<PlayerId, Player> players = new LinkedHashMap<>();
    private final Deque<ChatMessage> chatLog = new ArrayDeque<>();

    private String title;
    private PlayerId hostId;
    private RoomSettings settings = RoomSettings.defaults();
    private Game game;

    private Room(RoomId id, String title, Player host, Instant createdAt) {
        this.id = id;
        this.title = title;
        this.hostId = host.id();
        this.createdAt = createdAt;
        this.players.put(host.id(), host);
    }

    public static Room open(String rawTitle, Player host, Instant now) {
        return new Room(RoomId.generate(), normalizeTitle(rawTitle, host.nickname()), host, now);
    }

    private static String normalizeTitle(String rawTitle, Nickname hostName) {
        String cleaned = TextSanitizer.visibleOnly(rawTitle);
        if (cleaned.isEmpty()) {
            return "%s의 방".formatted(hostName.value());
        }
        return cleaned.length() > 20 ? cleaned.substring(0, 20) : cleaned;
    }

    // ------------------------------------------------------------------- 조회

    public RoomId id() {
        return id;
    }

    public String title() {
        return title;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public PlayerId hostId() {
        return hostId;
    }

    public boolean isHost(PlayerId candidate) {
        return hostId.equals(candidate);
    }

    public RoomSettings settings() {
        return settings;
    }

    public List<Player> players() {
        return List.copyOf(players.values());
    }

    public Optional<Player> find(PlayerId playerId) {
        return Optional.ofNullable(players.get(playerId));
    }

    public boolean contains(PlayerId playerId) {
        return players.containsKey(playerId);
    }

    public int playerCount() {
        return players.size();
    }

    public boolean isEmpty() {
        return players.isEmpty();
    }

    /** 아무도 접속해 있지 않은 상태. 유예 시간이 지나면 방을 정리하는 기준이 됨. */
    public boolean hasNoConnectedPlayer() {
        return players.values().stream().noneMatch(Player::isConnected);
    }

    public Optional<Game> game() {
        return Optional.ofNullable(game);
    }

    public RoomStatus status() {
        if (game == null) {
            return RoomStatus.WAITING;
        }
        return game.isFinished() ? RoomStatus.RESULT : RoomStatus.PLAYING;
    }

    public boolean isJoinable() {
        return status() == RoomStatus.WAITING && playerCount() < GameRules.MAX_PLAYERS;
    }

    public List<ChatMessage> chatHistory() {
        return List.copyOf(chatLog);
    }

    // ------------------------------------------------------------- 참가자 변경

    public void join(Player player) {
        if (players.containsKey(player.id())) {
            return;
        }
        if (status() != RoomStatus.WAITING) {
            throw new RuleViolationException("게임이 진행 중인 방에는 입장할 수 없음");
        }
        if (playerCount() >= GameRules.MAX_PLAYERS) {
            throw new RuleViolationException(
                    "정원이 가득 찼음 (최대 %d명)".formatted(GameRules.MAX_PLAYERS));
        }
        players.put(player.id(), player);
    }

    /**
     * 방에서 완전히 내보냄.
     *
     * <p>게임 중에는 스스로 나갈 수 없다는 규칙은 상위 계층의 "나가기" 요청에만 적용되고, 접속이
     * 끊긴 채 유예 시간이 지난 경우에는 이 메서드로 정리됨.
     */
    public void remove(PlayerId playerId) {
        players.remove(playerId);
        if (playerId.equals(hostId)) {
            handOverHost();
        }
    }

    /** 방장이 사라졌을 때 남아 있는 사람 중 가장 먼저 들어온 사람에게 권한을 넘김. */
    private void handOverHost() {
        players.values().stream()
                .filter(Player::isConnected)
                .findFirst()
                .or(() -> players.values().stream().findFirst())
                .ifPresent(next -> hostId = next.id());
    }

    public void markConnected(PlayerId playerId) {
        find(playerId).ifPresent(Player::markConnected);
    }

    public void markDisconnected(PlayerId playerId) {
        find(playerId).ifPresent(Player::markDisconnected);
    }

    // ------------------------------------------------------------------- 설정

    public void changeSettings(PlayerId requester, int totalRounds) {
        requireHost(requester);
        if (status() == RoomStatus.PLAYING) {
            throw new RuleViolationException("게임 진행 중에는 설정을 바꿀 수 없음");
        }
        this.settings = settings.withRounds(totalRounds);
    }

    // ------------------------------------------------------------------- 게임

    public Game startGame(
            PlayerId requester,
            GameRules rules,
            WordPairProvider wordPairProvider,
            RoundRandomizer randomizer,
            Instant now) {
        requireHost(requester);
        if (status() == RoomStatus.PLAYING) {
            throw new RuleViolationException("이미 게임이 진행 중임");
        }
        List<PlayerId> participants =
                players.values().stream().filter(Player::isConnected).map(Player::id).toList();
        if (participants.size() < GameRules.MIN_PLAYERS) {
            throw new RuleViolationException(
                    "%d명 이상 접속해 있어야 시작할 수 있음".formatted(GameRules.MIN_PLAYERS));
        }
        this.game = Game.start(
                participants, settings.totalRounds(), rules, wordPairProvider, randomizer, now);
        return game;
    }

    /** 결과 화면을 닫고 대기실로 되돌림. */
    public void returnToLobby() {
        this.game = null;
    }

    // ------------------------------------------------------------------- 채팅

    public ChatMessage speak(PlayerId speaker, String rawText, Instant now) {
        Player player =
                find(speaker).orElseThrow(() -> new RuleViolationException("이 방의 참가자가 아님"));
        String text = sanitize(rawText);
        if (text.isEmpty()) {
            throw new RuleViolationException("메시지가 비어 있음");
        }
        if (game != null && !game.canChat(speaker)) {
            throw new RuleViolationException("지금은 발언할 수 없는 시간임");
        }
        ChatMessage message = speaker.equals(defendantId())
                ? ChatMessage.defense(speaker, player.nickname().value(), text, now)
                : ChatMessage.chat(speaker, player.nickname().value(), text, now);
        append(message);
        return message;
    }

    public ChatMessage announce(String text, Instant now) {
        ChatMessage message = ChatMessage.system(text, now);
        append(message);
        return message;
    }

    /** 최후 진술 중인 사람. 없으면 null 이라 일반 발언과 구분됨. */
    private PlayerId defendantId() {
        return game().map(Game::round).map(round -> round.accusedId()).orElse(null);
    }

    private void append(ChatMessage message) {
        chatLog.addLast(message);
        while (chatLog.size() > CHAT_HISTORY_LIMIT) {
            chatLog.removeFirst();
        }
    }

    private static String sanitize(String raw) {
        if (raw == null) {
            return "";
        }
        String cleaned = TextSanitizer.visibleOnly(raw);
        return cleaned.length() > ChatMessage.MAX_LENGTH
                ? cleaned.substring(0, ChatMessage.MAX_LENGTH)
                : cleaned;
    }

    private void requireHost(PlayerId requester) {
        if (!isHost(requester)) {
            throw new RuleViolationException("방장만 할 수 있는 동작임");
        }
    }
}
