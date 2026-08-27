import { create } from 'zustand'
import { connectRoom, type RoomSocket } from '@/lib/socket'
import { clearTicket, saveTicket } from '@/lib/storage'
import type { ChatView, JoinTicket, RoomView, SecretView, ServerMessage } from '@/types/protocol'

/**
 * 방 하나에 대한 클라이언트 상태.
 *
 * 서버가 변경마다 전체 스냅샷을 내려 주므로 여기서는 그것을 그대로 담기만 하고 파생 계산을 하지
 * 않음. 클라이언트가 상태를 직접 굴리기 시작하면 서버와 어긋나 재현하기 어려운 버그가 생기는데,
 * 그 여지를 처음부터 없애기 위한 선택임.
 */

/** 화면에 남겨 둘 최근 대화 수. 서버 보관량과 맞춤 */
const CHAT_LIMIT = 200

interface ToastError {
  id: number
  text: string
}

interface RoomState {
  ticket: JoinTicket | null
  room: RoomView | null
  chat: ChatView[]
  secret: SecretView | null
  connected: boolean
  error: ToastError | null
  closedReason: string | null
  /** 서버 시각에서 브라우저 시각을 뺀 값. 카운트다운을 서버 기준으로 맞추는 데 씀 */
  clockSkew: number

  enter: (ticket: JoinTicket) => void
  exit: () => void
  send: (action: string, body?: unknown) => void
  dismissError: () => void
}

let socket: RoomSocket | null = null
let errorSequence = 0

const initialState = {
  ticket: null,
  room: null,
  chat: [],
  secret: null,
  connected: false,
  error: null,
  closedReason: null,
  clockSkew: 0,
} satisfies Omit<RoomState, 'enter' | 'exit' | 'send' | 'dismissError'>

export const useRoomStore = create<RoomState>((set, get) => {
  const handle = (message: ServerMessage): void => {
    switch (message.type) {
      case 'ROOM_STATE':
        set({
          room: message.payload,
          clockSkew: message.payload.serverTime - Date.now(),
          secret: message.payload.game ? get().secret : null,
        })
        break
      case 'CHAT':
        set((state) => ({ chat: [...state.chat, message.payload].slice(-CHAT_LIMIT) }))
        break
      case 'CHAT_HISTORY':
        set({ chat: message.payload.slice(-CHAT_LIMIT) })
        break
      case 'SECRET':
        set({ secret: message.payload })
        break
      case 'ERROR':
        set({ error: { id: ++errorSequence, text: message.payload.reason } })
        break
      case 'CLOSED':
        set({ closedReason: message.payload.reason })
        break
      case 'ROOM_LIST':
        break
    }
  }

  return {
    ...initialState,

    enter: (ticket) => {
      socket?.close()
      saveTicket(ticket)
      set({ ...initialState, ticket })
      socket = connectRoom({
        roomId: ticket.roomId,
        playerId: ticket.playerId,
        onMessage: handle,
        onConnectionChange: (connected) => set({ connected }),
      })
    },

    exit: () => {
      const ticket = get().ticket
      if (ticket) clearTicket(ticket.roomId)
      socket?.close()
      socket = null
      set({ ...initialState })
    },

    send: (action, body) => socket?.send(action, body),

    dismissError: () => set({ error: null }),
  }
})
