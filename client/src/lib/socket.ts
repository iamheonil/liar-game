import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import type { ServerMessage } from '@/types/protocol'

/**
 * STOMP 연결 관리.
 *
 * 모바일에서는 화면을 잠그거나 앱을 전환하기만 해도 연결이 끊기므로 재연결은 예외가 아니라 정상
 * 동작임. 그래서 라이브러리의 자동 재연결을 켜 두고, 다시 붙을 때마다 구독을 새로 걸고 서버에
 * 현재 상태를 다시 달라고 요청함. 서버가 매번 전체 스냅샷을 내려 주기 때문에 이것만으로 화면이
 * 정확히 복구됨.
 */

const RECONNECT_DELAY_MS = 1500
const HEARTBEAT_MS = 10_000

function brokerUrl(params: Record<string, string>): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const query = new URLSearchParams(params).toString()
  const suffix = query ? `?${query}` : ''
  return `${protocol}//${window.location.host}/ws${suffix}`
}

function parse(message: IMessage): ServerMessage | null {
  try {
    return JSON.parse(message.body) as ServerMessage
  } catch {
    return null
  }
}

export interface RoomSocket {
  /** 서버로 명령을 보냄. 연결이 끊긴 동안의 호출은 조용히 버려짐 */
  send(action: string, body?: unknown): void
  close(): void
}

interface RoomSocketOptions {
  roomId: string
  playerId: string
  onMessage: (message: ServerMessage) => void
  onConnectionChange: (connected: boolean) => void
}

export function connectRoom(options: RoomSocketOptions): RoomSocket {
  const { roomId, playerId, onMessage, onConnectionChange } = options
  const subscriptions: StompSubscription[] = []

  const client = new Client({
    brokerURL: brokerUrl({ roomId, playerId }),
    reconnectDelay: RECONNECT_DELAY_MS,
    heartbeatIncoming: HEARTBEAT_MS,
    heartbeatOutgoing: HEARTBEAT_MS,
    onConnect: () => {
      subscriptions.length = 0
      const relay = (message: IMessage) => {
        const parsed = parse(message)
        if (parsed) onMessage(parsed)
      }
      subscriptions.push(client.subscribe(`/topic/room/${roomId}`, relay))
      subscriptions.push(client.subscribe('/user/queue/private', relay))
      onConnectionChange(true)
      client.publish({ destination: `/app/room/${roomId}/sync`, body: '{}' })
    },
    onWebSocketClose: () => onConnectionChange(false),
    onStompError: () => onConnectionChange(false),
  })

  client.activate()

  return {
    send(action, body) {
      if (!client.connected) return
      client.publish({
        destination: `/app/room/${roomId}/${action}`,
        body: JSON.stringify(body ?? {}),
      })
    },
    close() {
      subscriptions.forEach((subscription) => subscription.unsubscribe())
      void client.deactivate()
    },
  }
}

/** 방 목록 화면 전용. 방에 속하지 않은 익명 연결이라 방 관련 이벤트를 만들지 않음. */
export function connectLobby(onMessage: (message: ServerMessage) => void): () => void {
  const client = new Client({
    brokerURL: brokerUrl({}),
    reconnectDelay: RECONNECT_DELAY_MS,
    heartbeatIncoming: HEARTBEAT_MS,
    heartbeatOutgoing: HEARTBEAT_MS,
    onConnect: () => {
      client.subscribe('/topic/lobby', (message) => {
        const parsed = parse(message)
        if (parsed) onMessage(parsed)
      })
    },
  })

  client.activate()
  return () => {
    void client.deactivate()
  }
}
