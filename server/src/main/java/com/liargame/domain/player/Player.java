package com.liargame.domain.player;

import java.util.Objects;

/**
 * 방에 참가한 사람.
 *
 * <p>접속 상태는 WebSocket 연결을 기준으로 판단함. 방을 만들거나 입장하는 REST 요청만으로는 아직
 * 접속으로 보지 않는데, 그래야 방만 만들어 두고 사라진 브라우저가 정원을 차지하지 않음.
 *
 * <p>모바일에서는 화면을 잠그기만 해도 연결이 끊기므로, 끊김이 곧 이탈은 아님. 이탈 확정은 상위
 * 계층의 재접속 유예 시간이 지난 뒤에 이뤄짐.
 */
public class Player {

    private final PlayerId id;
    private Nickname nickname;
    private boolean connected;
    private boolean everConnected;

    public Player(PlayerId id, Nickname nickname) {
        this.id = Objects.requireNonNull(id);
        this.nickname = Objects.requireNonNull(nickname);
        this.connected = false;
    }

    public static Player join(Nickname nickname) {
        return new Player(PlayerId.generate(), nickname);
    }

    public PlayerId id() {
        return id;
    }

    public Nickname nickname() {
        return nickname;
    }

    public void rename(Nickname nickname) {
        this.nickname = Objects.requireNonNull(nickname);
    }

    public boolean isConnected() {
        return connected;
    }

    public void markConnected() {
        this.connected = true;
        this.everConnected = true;
    }

    /** 이 방에 한 번이라도 실제로 접속한 적이 있는지. 입장 안내와 재접속 안내를 구분하는 데 씀. */
    public boolean hasEverConnected() {
        return everConnected;
    }

    public void markDisconnected() {
        this.connected = false;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof Player player && id.equals(player.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}
