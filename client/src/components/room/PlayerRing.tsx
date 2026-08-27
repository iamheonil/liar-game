import { useMemo } from 'react'
import { LampScene } from '@/components/scene/LampScene'
import { PHASE_META } from '@/lib/phase'
import { PlayerSeat } from './PlayerSeat'
import type { GameView, PlayerView } from '@/types/protocol'

interface PlayerRingProps {
  players: PlayerView[]
  meId: string
  game?: GameView
  /** 값이 바뀔 때마다 전구가 한 번 흔들림. 지목 확정과 처형 가결의 순간에 올라감 */
  shakeKey?: number
  onVote?: (playerId: string) => void
}

/**
 * 좌석 크기의 절반.
 *
 * 좌석은 중심 좌표에 놓고 -50% 만큼 밀어 배치하므로, 타원 반지름을 이 값만큼 안으로 당겨야
 * 가장자리 좌석이 밖으로 튀어나가지 않음. 8명이 앉는 최대 인원에서 특히 중요함.
 */
const SEAT_HALF_WIDTH_PX = 84
const SEAT_HALF_HEIGHT_PX = 24

/**
 * 참가자 배치.
 *
 * 넓은 화면에서는 책상을 둘러싸고 둥글게 앉히고, 좁은 화면에서는 목록으로 세움. 두 배치 모두
 * "나"를 맨 앞(아래 가운데)에 두어 자기 자리를 찾는 데 시간을 쓰지 않게 함.
 *
 * 좁은 화면에서는 전구 장면을 아예 그리지 않음. 예전에는 세로로 128px 을 차지해 그만큼 대화가
 * 밀려났는데, 이 장면은 정보가 아니라 분위기라서 좁은 화면에서 자리를 두고 다툴 이유가 없음.
 * 좌석 뒤에 깔아 보기도 했지만 두 기둥 사이로만 삐져나와 얼룩처럼 보였음. 천장에서 내려오는
 * 빛은 .atmosphere 의 배경 그라디언트가 이미 만들고 있으므로 분위기가 사라지지도 않음.
 *
 * 대신 전구가 흔들릴 자리에서는 좌석 무리를 흔듦. 결정이 내려졌다는 신호는 그대로 전해지고
 * 높이는 하나도 쓰지 않음.
 */
export function PlayerRing({ players, meId, game, shakeKey = 0, onVote }: PlayerRingProps) {
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
  // 긴장 단계 판정은 PHASE_META 한 곳에만 둠. 예전에는 여기에 같은 목록을 따로 들고 있어서
  // 단계를 하나 추가하면 헤더는 붉어지는데 전구는 그대로인 어긋남이 생길 수 있었음
  const tense = game ? PHASE_META[game.phase].tense : false

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

  const lamp = (className: string) => (
    <LampScene
      key={shakeKey}
      className={`${className} ${shakeKey > 0 ? 'lamp-shake' : ''}`}
      tense={tense}
    />
  )

  return (
    <>
      {/* 넓은 화면: 책상을 둘러싼 원형 배치. 남는 높이를 그대로 받아 씀 */}
      <div className="relative hidden min-h-[240px] w-full flex-1 lg:block">
        {lamp('absolute inset-0 h-full w-full')}
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

      {/* 좁은 화면: 좌석 목록만. 전구 대신 좌석 무리가 흔들림 */}
      <div
        key={shakeKey}
        className={`grid shrink-0 grid-cols-2 gap-2 lg:hidden ${shakeKey > 0 ? 'jolt' : ''}`}
      >
        {ordered.map(seatOf)}
      </div>
    </>
  )
}
