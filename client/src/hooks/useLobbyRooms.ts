import { useCallback, useEffect, useState } from 'react'
import { fetchRooms } from '@/lib/api'
import { connectLobby } from '@/lib/socket'
import type { RoomSummaryView } from '@/types/protocol'

/**
 * 방 목록을 실시간으로 유지함.
 *
 * 처음 한 번은 REST 로 받아 오고, 이후 변화는 서버가 로비 채널로 밀어 줌. 누가 방을 만들거나
 * 게임을 시작하면 새로 고침 없이 목록이 바뀜.
 */
export function useLobbyRooms(): { rooms: RoomSummaryView[]; loading: boolean; refresh: () => void } {
  const [rooms, setRooms] = useState<RoomSummaryView[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    fetchRooms()
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
    return connectLobby((message) => {
      if (message.type === 'ROOM_LIST') setRooms(message.payload)
    })
  }, [refresh])

  return { rooms, loading, refresh }
}
