import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, createRoom, joinRoom } from '@/lib/api'
import { isComposingEnter } from '@/lib/ime'
import { loadNickname, saveTicket } from '@/lib/storage'
import { useLobbyRooms } from '@/hooks/useLobbyRooms'
import { useRoomStore } from '@/store/useRoomStore'
import type { RoomSummaryView } from '@/types/protocol'

const STATUS_LABEL: Record<string, string> = {
  WAITING: '대기 중',
  PLAYING: '게임 중',
  RESULT: '결과 발표 중',
}

/**
 * 방 목록.
 *
 * 만들어진 방을 실시간으로 보여 주고, 새 방을 여는 버튼을 함께 둠. 게임이 이미 시작된 방도
 * 목록에는 남기되 들어갈 수 없게 표시함. 방이 왜 안 보이는지 헷갈리는 것보다 낫기 때문임.
 */
export function LobbyPage() {
  const navigate = useNavigate()
  const nickname = loadNickname()
  const { rooms, loading } = useLobbyRooms()
  const enter = useRoomStore((state) => state.enter)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')

  if (!nickname) {
    navigate('/', { replace: true })
    return null
  }

  const go = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : '요청을 처리하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  const openRoom = () =>
    go(async () => {
      const ticket = await createRoom(nickname, title)
      saveTicket(ticket)
      enter(ticket)
      navigate(`/room/${ticket.roomId}`)
    })

  const enterRoom = (summary: RoomSummaryView) =>
    go(async () => {
      const ticket = await joinRoom(summary.roomId, nickname)
      saveTicket(ticket)
      enter(ticket)
      navigate(`/room/${ticket.roomId}`)
    })

  return (
    <main className="screen atmosphere mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">LIAR</p>
          <h1 className="font-display text-2xl font-bold text-bone-100">방 목록</h1>
        </div>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => navigate('/')}>
          {nickname} · 이름 바꾸기
        </button>
      </header>

      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={busy}
        onClick={() => setCreating((open) => !open)}
      >
        {creating ? '접기' : '방 만들기'}
      </button>

      {creating && (
        <div className="panel flex flex-col gap-3 px-4 py-4">
          <label className="eyebrow" htmlFor="room-title">
            방 이름
          </label>
          <input
            id="room-title"
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={`${nickname}의 방`}
            maxLength={20}
            enterKeyHint="go"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !isComposingEnter(event)) void openRoom()
            }}
          />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={openRoom}>
            열기
          </button>
        </div>
      )}

      {error && (
        <p className="panel-flat px-4 py-2.5 text-sm" style={{ color: 'var(--blood-400)' }}>
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2">
        {loading ? (
          <p className="py-12 text-center text-sm text-bone-700">불러오는 중...</p>
        ) : rooms.length === 0 ? (
          <p className="py-12 text-center text-sm text-bone-700">
            아직 열린 방이 없습니다. 첫 방을 만들어 보세요.
          </p>
        ) : (
          rooms.map((room) => (
            <button
              key={room.roomId}
              type="button"
              className="panel flex items-center gap-3 px-4 py-3 text-left transition-transform duration-200 enabled:hover:-translate-y-0.5 disabled:opacity-45"
              disabled={busy || !room.joinable}
              onClick={() => enterRoom(room)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-bone-100">{room.title}</p>
                <p className="mt-0.5 text-xs text-bone-700">
                  {room.hostNickname} · {room.totalRounds}라운드 ·{' '}
                  <span style={{ color: room.joinable ? 'var(--lamp-600)' : 'var(--blood-400)' }}>
                    {STATUS_LABEL[room.status] ?? room.status}
                  </span>
                </p>
              </div>
              <span className="tabular shrink-0 text-sm text-bone-500">
                {room.playerCount} / {room.maxPlayers}
              </span>
            </button>
          ))
        )}
      </section>
    </main>
  )
}
