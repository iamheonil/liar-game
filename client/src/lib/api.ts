import type { JoinTicket, RoomSummaryView } from '@/types/protocol'

/**
 * REST 호출 모음.
 *
 * 실시간 진행은 전부 WebSocket 이 담당하고, 여기서는 "소켓을 열기 전에 필요한 일"만 다룸.
 */

const BASE = '/api'

interface ErrorBody {
  message?: string
}

/** 서버가 돌려준 사유를 그대로 보여 줄 수 있도록 감싼 오류. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError('서버에 연결하지 못했습니다', 0)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody
    throw new ApiError(body.message ?? '요청을 처리하지 못했습니다', response.status)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export function fetchRooms(): Promise<RoomSummaryView[]> {
  return request<RoomSummaryView[]>('/rooms')
}

export function createRoom(nickname: string, title: string): Promise<JoinTicket> {
  return request<JoinTicket>('/rooms', {
    method: 'POST',
    body: JSON.stringify({ nickname, title }),
  })
}

export function joinRoom(roomId: string, nickname: string): Promise<JoinTicket> {
  return request<JoinTicket>(`/rooms/${roomId}/players`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  })
}

export function leaveRoom(roomId: string, playerId: string): Promise<void> {
  return request<void>(`/rooms/${roomId}/players/${playerId}`, { method: 'DELETE' })
}
