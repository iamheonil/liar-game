import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionBar } from '@/components/room/ActionBar'
import { ChatPanel } from '@/components/room/ChatPanel'
import { GameResultOverlay } from '@/components/room/GameResultOverlay'
import { HintBoard } from '@/components/room/HintBoard'
import { PlayerRing } from '@/components/room/PlayerRing'
import { RoomHeader } from '@/components/room/RoomHeader'
import { RoundResultOverlay } from '@/components/room/RoundResultOverlay'
import { SecretCard } from '@/components/room/SecretCard'
import { WaitingControls } from '@/components/room/WaitingControls'
import { Toast } from '@/components/ui/Toast'
import { useCountdown } from '@/hooks/useCountdown'
import { ApiError, joinRoom, leaveRoom } from '@/lib/api'
import { loadNickname, loadTicket, saveTicket } from '@/lib/storage'
import { useRoomStore } from '@/store/useRoomStore'

/**
 * 게임 화면.
 *
 * 입장 경로가 두 가지임. 로비에서 들어오면 이미 입장권이 있고, 초대 링크로 바로 들어오면 여기서
 * 발급받아야 함. 두 경우를 한곳에서 처리하되, 개발 모드의 이중 실행으로 같은 사람이 두 번
 * 입장하지 않도록 시도 여부를 기록해 둠.
 */
export function RoomPage() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const joinAttempted = useRef(false)
  const [joinError, setJoinError] = useState('')

  const ticket = useRoomStore((state) => state.ticket)
  const room = useRoomStore((state) => state.room)
  const chat = useRoomStore((state) => state.chat)
  const secret = useRoomStore((state) => state.secret)
  const connected = useRoomStore((state) => state.connected)
  const error = useRoomStore((state) => state.error)
  const closedReason = useRoomStore((state) => state.closedReason)
  const clockSkew = useRoomStore((state) => state.clockSkew)
  const enter = useRoomStore((state) => state.enter)
  const exit = useRoomStore((state) => state.exit)
  const send = useRoomStore((state) => state.send)
  const dismissError = useRoomStore((state) => state.dismissError)

  useEffect(() => {
    if (!roomId || ticket?.roomId === roomId || joinAttempted.current) return
    joinAttempted.current = true

    const stored = loadTicket(roomId)
    if (stored) {
      enter(stored)
      return
    }
    const nickname = loadNickname()
    if (!nickname) {
      navigate('/', { replace: true })
      return
    }
    joinRoom(roomId, nickname)
      .then((issued) => {
        saveTicket(issued)
        enter(issued)
      })
      .catch((cause) =>
        setJoinError(cause instanceof ApiError ? cause.message : '입장하지 못했습니다'),
      )
  }, [roomId, ticket, enter, navigate])

  // 방이 닫히면 더 볼 것이 없으므로 목록으로 돌려보냄
  useEffect(() => {
    if (!closedReason) return
    const timer = window.setTimeout(() => {
      exit()
      navigate('/lobby', { replace: true })
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [closedReason, exit, navigate])

  // 게임 도중 새로고침이나 창 닫기는 곧 이탈이라 한 번 되묻게 함
  useEffect(() => {
    if (room?.status !== 'PLAYING') return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [room?.status])

  const remaining = useCountdown(room?.game?.phaseEndsAt, clockSkew)

  if (joinError) {
    return (
      <main className="screen atmosphere flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm" style={{ color: 'var(--blood-400)' }}>
          {joinError}
        </p>
        <button type="button" className="btn" onClick={() => navigate('/lobby')}>
          방 목록으로
        </button>
      </main>
    )
  }

  if (!room || !ticket) {
    return (
      <main className="screen atmosphere flex items-center justify-center">
        <p className="text-sm text-bone-700">방에 들어가는 중...</p>
      </main>
    )
  }

  const meId = ticket.playerId
  const game = room.game
  const isHost = room.hostId === meId

  const handleLeave = () => {
    void leaveRoom(room.roomId, meId).catch(() => undefined)
    exit()
    navigate('/lobby', { replace: true })
  }

  return (
    <main className="screen atmosphere flex flex-col">
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="lg:col-span-2">
            <RoomHeader
              room={room}
              remaining={remaining}
              connected={connected}
              canLeave={room.status !== 'PLAYING'}
              onLeave={handleLeave}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {game && secret && (
              <SecretCard secret={secret} emphasized={game.phase === 'ROLE_REVEAL'} />
            )}

            <PlayerRing
              players={room.players}
              meId={meId}
              game={game}
              onVote={(targetId) => send('vote', { targetId })}
            />

            {game ? (
              <HintBoard
                hints={game.hints}
                players={room.players}
                turnPlayerId={game.turnPlayerId}
                meId={meId}
              />
            ) : (
              <WaitingControls room={room} meId={meId} onSend={send} />
            )}
          </div>

          <ChatPanel
            messages={chat}
            meId={meId}
            className="h-72 min-w-0 lg:h-[calc(100dvh-13rem)]"
          />
        </div>
      </div>

      <div
        className="border-t border-[var(--edge)] bg-ink-900/92 px-3 py-3 backdrop-blur"
        style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
      >
        <div className="mx-auto w-full max-w-6xl">
          <ActionBar room={room} meId={meId} onSend={send} />
        </div>
      </div>

      {game?.phase === 'ROUND_RESULT' && game.lastRound && (
        <RoundResultOverlay result={game.lastRound} players={room.players} meId={meId} />
      )}

      {game?.phase === 'GAME_RESULT' && game.finalResult && (
        <GameResultOverlay
          result={game.finalResult}
          meId={meId}
          isHost={isHost}
          onReturnToLobby={() => send('return-to-lobby')}
        />
      )}

      {closedReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 px-6 text-center">
          <p className="text-sm text-bone-300">{closedReason}</p>
        </div>
      )}

      {error && <Toast id={error.id} text={error.text} onDismiss={dismissError} />}
    </main>
  )
}
