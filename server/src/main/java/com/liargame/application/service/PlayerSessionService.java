package com.liargame.application.service;

import com.liargame.application.port.DelayedExecutor;
import com.liargame.domain.game.GameRules;
import com.liargame.domain.player.Player;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.Room;
import com.liargame.domain.room.RoomId;
import java.time.Clock;
import org.springframework.stereotype.Service;

/**
 * WebSocket 접속 상태를 방 상태에 반영함.
 *
 * <p>모바일 브라우저는 화면을 잠그거나 앱을 전환하기만 해도 연결이 끊기므로, 끊김을 곧바로 이탈로
 * 보면 게임이 수시로 망가짐. 그래서 끊기면 유예 시간을 두고 기다렸다가, 그 안에 돌아오지 않은
 * 경우에만 이탈로 확정함.
 */
@Service
public class PlayerSessionService {

    private final RoomService roomService;
    private final GameFlowService gameFlow;
    private final RoomLockRegistry locks;
    private final RoomBroadcaster broadcaster;
    private final DelayedExecutor delayed;
    private final GameRules rules;
    private final Clock clock;

    public PlayerSessionService(
            RoomService roomService,
            GameFlowService gameFlow,
            RoomLockRegistry locks,
            RoomBroadcaster broadcaster,
            DelayedExecutor delayed,
            GameRules rules,
            Clock clock) {
        this.roomService = roomService;
        this.gameFlow = gameFlow;
        this.locks = locks;
        this.broadcaster = broadcaster;
        this.delayed = delayed;
        this.rules = rules;
        this.clock = clock;
    }

    public void onConnected(RoomId roomId, PlayerId playerId) {
        locks.run(roomId, () -> {
            Room room = roomService.find(roomId).orElse(null);
            Player player = room == null ? null : room.find(playerId).orElse(null);
            if (player == null) {
                broadcaster.error(playerId, "이 방의 참가자가 아님");
                return;
            }
            delayed.cancel(graceKey(roomId, playerId));
            boolean rejoining = player.hasEverConnected();
            room.markConnected(playerId);
            broadcaster.chat(room, room.announce(
                    rejoining
                            ? "%s 님이 다시 접속했습니다".formatted(player.nickname().value())
                            : "%s 님이 입장했습니다".formatted(player.nickname().value()),
                    clock.instant()));
        });
        gameFlow.resync(roomId, playerId);
        broadcaster.lobby();
    }

    public void onDisconnected(RoomId roomId, PlayerId playerId) {
        locks.run(roomId, () -> {
            Room room = roomService.find(roomId).orElse(null);
            if (room == null || !room.contains(playerId)) {
                return;
            }
            room.markDisconnected(playerId);
            broadcaster.state(room);
            delayed.schedule(
                    graceKey(roomId, playerId),
                    clock.instant().plus(rules.disconnectGrace()),
                    () -> onGraceExpired(roomId, playerId));
        });
    }

    /** 유예 시간이 끝났을 때. 그사이 다시 접속했다면 아무 일도 하지 않음. */
    private void onGraceExpired(RoomId roomId, PlayerId playerId) {
        boolean stillGone = locks.call(roomId, () -> roomService.find(roomId)
                .flatMap(room -> room.find(playerId))
                .map(player -> !player.isConnected())
                .orElse(false));
        if (stillGone) {
            gameFlow.abandon(roomId, playerId);
        }
    }

    private static String graceKey(RoomId roomId, PlayerId playerId) {
        return "grace:%s:%s".formatted(roomId.value(), playerId.value());
    }
}
