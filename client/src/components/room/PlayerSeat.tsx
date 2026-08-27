import type { PlayerView } from '@/types/protocol'

export interface SeatState {
  isMe: boolean
  isTurn: boolean
  isAccused: boolean
  isMyVoteTarget: boolean
  voteCount: number
  selectable: boolean
}

interface PlayerSeatProps extends SeatState {
  player: PlayerView
  onSelect?: (playerId: string) => void
}

/**
 * 참가자 한 명을 나타내는 자리.
 *
 * 상태를 색으로 구분함. 지금 말할 차례면 등불색 테두리가 켜지고, 지목당하면 핏빛으로 바뀜.
 * 연결이 끊긴 사람은 흐려지고, 게임에서 빠진 사람은 이름에 줄이 그어짐.
 */
export function PlayerSeat({
  player,
  isMe,
  isTurn,
  isAccused,
  isMyVoteTarget,
  voteCount,
  selectable,
  onSelect,
}: PlayerSeatProps) {
  const ring = isAccused
    ? 'var(--blood-500)'
    : isTurn
      ? 'var(--lamp-500)'
      : isMyVoteTarget
        ? 'var(--blood-400)'
        : 'var(--edge)'

  const glow = isTurn
    ? '0 0 24px -4px color-mix(in oklab, var(--lamp-500) 65%, transparent)'
    : isAccused
      ? '0 0 24px -4px color-mix(in oklab, var(--blood-500) 70%, transparent)'
      : 'none'

  const classes = [
    'panel-flat relative flex w-full items-center gap-2.5 px-3 py-2 text-left',
    'transition-[transform,border-color,box-shadow] duration-200',
    selectable ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : '',
    player.abandoned ? 'opacity-35' : player.connected ? '' : 'opacity-55',
  ].join(' ')

  const body = (
    <>
      {isTurn && (
        <span
          className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full"
          style={{ background: 'var(--lamp-400)', animation: 'pulse 1.2s ease-in-out infinite' }}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`truncate text-sm font-medium ${player.abandoned ? 'line-through' : ''}`}
            style={{ color: isMe ? 'var(--lamp-400)' : 'var(--bone-100)' }}
          >
            {player.nickname}
          </span>
          {player.host && <span className="text-[0.6rem] text-lamp-600">방장</span>}
          {isMe && <span className="text-[0.6rem] text-bone-700">나</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[0.68rem] text-bone-700">
          <span className="tabular">{player.score}점</span>
          {player.abandoned ? (
            <span style={{ color: 'var(--blood-400)' }}>이탈</span>
          ) : (
            !player.connected && <span>연결 끊김</span>
          )}
        </div>
      </div>

      {voteCount > 0 && (
        <span
          className="tabular flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold"
          style={{ background: 'var(--blood-600)', color: 'var(--bone-100)' }}
          aria-label={`${voteCount}표`}
        >
          {voteCount}
        </span>
      )}
    </>
  )

  if (!selectable) {
    return (
      <div className={classes} style={{ borderColor: ring, boxShadow: glow }}>
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(player.id)}
      disabled={player.abandoned || !player.connected}
      aria-pressed={isMyVoteTarget}
      className={classes}
      style={{ borderColor: ring, boxShadow: glow }}
    >
      {body}
    </button>
  )
}
