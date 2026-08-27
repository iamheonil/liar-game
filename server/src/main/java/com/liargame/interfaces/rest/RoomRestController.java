package com.liargame.interfaces.rest;

import com.liargame.application.service.RoomService;
import com.liargame.application.view.JoinTicketView;
import com.liargame.application.view.RoomSummaryView;
import com.liargame.domain.player.PlayerId;
import com.liargame.domain.room.RoomId;
import com.liargame.interfaces.dto.CreateRoomRequest;
import com.liargame.interfaces.dto.JoinRoomRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 방 목록과 입장을 다루는 REST 진입점.
 *
 * <p>실시간 게임 진행은 WebSocket 이 맡고, 여기서는 "WebSocket 을 열기 전에 필요한 일"만 처리함.
 * 방에 들어가려면 playerId 가 있어야 하는데 그 발급이 바로 이 단계임.
 */
@RestController
@RequestMapping("/api/rooms")
public class RoomRestController {

    private final RoomService roomService;

    public RoomRestController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<RoomSummaryView> list() {
        return roomService.listRooms();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JoinTicketView create(@RequestBody CreateRoomRequest request) {
        return roomService.createRoom(request.nickname(), request.title());
    }

    @PostMapping("/{roomId}/players")
    public JoinTicketView join(
            @PathVariable String roomId, @RequestBody JoinRoomRequest request) {
        return roomService.joinRoom(roomId, request.nickname());
    }

    @DeleteMapping("/{roomId}/players/{playerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@PathVariable String roomId, @PathVariable String playerId) {
        roomService.leaveRoom(RoomId.of(roomId), PlayerId.of(playerId));
    }
}
