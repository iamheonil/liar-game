import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActionBar } from '@/components/room/ActionBar'
import { ChatPanel } from '@/components/room/ChatPanel'
import { GameResultOverlay } from '@/components/room/GameResultOverlay'
import { HintBoard } from '@/components/room/HintBoard'
import { LogTabs } from '@/components/room/LogTabs'
import { PlayerRing } from '@/components/room/PlayerRing'
import { RoomHeader } from '@/components/room/RoomHeader'
import { RoundResultOverlay } from '@/components/room/RoundResultOverlay'
import { SecretCard } from '@/components/room/SecretCard'
import { WaitingControls } from '@/components/room/WaitingControls'
import { TensionLayer } from '@/components/scene/TensionLayer'
import { Toast } from '@/components/ui/Toast'
import { useCountdown } from '@/hooks/useCountdown'
import { useSoundSettings } from '@/hooks/useSoundSettings'
import { useTension } from '@/hooks/useTension'
import { ApiError, joinRoom, leaveRoom } from '@/lib/api'
import { loadNickname, loadTicket, saveTicket } from '@/lib/storage'
import { pendingActionOf } from '@/lib/turn'
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
  const tension = useTension(room, ticket?.playerId ?? '', remaining)
  const soundSettings = useSoundSettings()

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
  // 내가 무언가를 해야 하는 순간에는 하단 입력 바 전체를 등불색으로 밝혀 시선을 끌어옴
  const awaitingMe = pendingActionOf(room, meId) !== null

  const handleLeave = () => {
    void leaveRoom(room.roomId, meId).catch(() => undefined)
    exit()
    navigate('/lobby', { replace: true })
  }

  return (
    <main className="screen-fixed atmosphere flex flex-col overflow-hidden">
      {/* 머리: 항상 같은 자리. 스크롤에 밀려나지 않음 */}
      <div className="shrink-0 px-3 pt-3">
        <div className="mx-auto w-full max-w-6xl">
          <RoomHeader
            room={room}
            remaining={remaining}
            connected={connected}
            canLeave={room.status !== 'PLAYING'}
            onLeave={handleLeave}
            sound={soundSettings}
          />
        </div>
      </div>

      {/* 본문: 남는 높이를 전부 받아 씀. 스크롤은 이 안쪽 목록에서만 일어남 */}
      <div className="min-h-0 flex-1 px-3 py-3">
        <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            {game && secret && (
              <SecretCard secret={secret} emphasized={game.phase === 'ROLE_REVEAL'} />
            )}

            <PlayerRing
              players={room.players}
              meId={meId}
              game={game}
              shakeKey={tension.shakeKey}
              onVote={(targetId) => send('vote', { targetId })}
            />

            {game ? (
              <HintBoard
                className="hidden lg:flex lg:min-h-[140px] lg:basis-[36%]"
                hints={game.hints}
                players={room.players}
                turnPlayerId={game.turnPlayerId}
                meId={meId}
              />
            ) : (
              <WaitingControls room={room} meId={meId} onSend={send} />
            )}

            {/* 좁은 화면에서는 힌트와 대화가 한 자리를 탭으로 나눠 씀 */}
            <LogTabs
              className="min-h-0 flex-1 lg:hidden"
              hints={game?.hints ?? []}
              players={room.players}
              turnPlayerId={game?.turnPlayerId}
              meId={meId}
              messages={chat}
              phase={game?.phase}
            />
          </div>

          <ChatPanel className="hidden min-h-0 lg:flex" messages={chat} meId={meId} />
        </div>
      </div>

      <div
        className={`action-dock shrink-0 px-3 py-3 backdrop-blur ${awaitingMe ? "is-awaiting" : ""}`}
        style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}
      >
        <div className="mx-auto w-full max-w-6xl">
          <ActionBar room={room} meId={meId} remaining={remaining} onSend={send} />
        </div>
      </div>

      <TensionLayer
        flashKey={tension.flashKey}
        flashTone={tension.flashTone}
        dread={tension.dread}
        beatMs={tension.beatMs}
      />

      {game?.phase === 'ROUND_RESULT' && game.lastRound && (
        <RoundResultOverlay
          result={game.lastRound}
          players={room.players}
          meId={meId}
          remaining={remaining}
        />
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
