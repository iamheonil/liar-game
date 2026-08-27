import { useMemo } from 'react'
import { LampScene } from '@/components/scene/LampScene'
import { PlayerSeat } from './PlayerSeat'
import type { GameView, PlayerView } from '@/types/protocol'

interface PlayerRingProps {
  players: PlayerView[]
  meId: string
  game?: GameView
  onVote?: (playerId: string) => void
}

/**
 * 좌석 크기의 절반.
 *
 * 좌석은 중심 좌표에 놓고 -50% 만큼 밀어 배치하므로, 타원 반지름을 이 값만큼 안으로 당겨야
 * 가장자리 좌석이 밖으로 튀어나가지 않음. 8명이 앉는 최대 인원에서 특히 중요함.
 */
const SEAT_HALF_WIDTH_PX = 84
const SEAT_HALF_HEIGHT_PX = 34

const TENSE_PHASES = new Set(['VOTE', 'DEFENSE', 'FINAL_VOTE', 'LIAR_GUESS'])

/**
 * 참가자 배치.
 *
 * 넓은 화면에서는 책상을 둘러싸고 둥글게 앉히고, 좁은 화면에서는 장면을 위로 접은 뒤 목록으로
 * 세움. 두 배치 모두 "나"를 맨 앞(아래 가운데)에 두어 자기 자리를 찾는 데 시간을 쓰지 않게 함.
 */
export function PlayerRing({ players, meId, game, onVote }: PlayerRingProps) {
  const ordered = useMemo(() => {
    const index = players.findIndex((player) => player.id === meId)
    return index <= 0 ? players : [...players.slice(index), ...players.slice(0, index)]
  }, [players, meId])

  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.values(game?.votes ?? {}).forEach((target) => {
      counts[target] = (counts[target] ?? 0) + 1
    })
    return counts
  }, [game?.votes])

  const selectable = game?.phase === 'VOTE'
  const myVote = game?.votes?.[meId]
  const tense = game ? TENSE_PHASES.has(game.phase) : false

  const seatOf = (player: PlayerView) => (
    <PlayerSeat
      key={player.id}
      player={player}
      isMe={player.id === meId}
      isTurn={game?.turnPlayerId === player.id}
      isAccused={game?.accusedId === player.id}
      isMyVoteTarget={myVote === player.id}
      voteCount={voteCounts[player.id] ?? 0}
      selectable={selectable && player.id !== meId}
      onSelect={onVote}
    />
  )

  return (
    <>
      {/* 넓은 화면: 책상을 둘러싼 원형 배치 */}
      <div className="relative hidden aspect-[16/10] w-full lg:block">
        <LampScene className="absolute inset-0 h-full w-full" tense={tense} />
        {ordered.map((player, index) => {
          const angle = Math.PI / 2 + (index * 2 * Math.PI) / ordered.length
          const cos = Math.cos(angle).toFixed(4)
          const sin = Math.sin(angle).toFixed(4)
          return (
            <div
              key={player.id}
              className="absolute w-[168px] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `calc(50% + (50% - ${SEAT_HALF_WIDTH_PX}px) * ${cos})`,
                top: `calc(50% + (50% - ${SEAT_HALF_HEIGHT_PX}px) * ${sin})`,
              }}
            >
              {seatOf(player)}
            </div>
          )
        })}
      </div>

      {/* 좁은 화면: 장면을 얇게 접고 목록으로 */}
      <div className="lg:hidden">
        <LampScene className="mx-auto h-32 w-full max-w-xs" tense={tense} />
        <div className="mt-3 grid grid-cols-2 gap-2">{ordered.map(seatOf)}</div>
      </div>
    </>
  )
}
