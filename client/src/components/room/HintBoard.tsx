import { Panel } from '@/components/ui/Panel'
import type { HintView, PlayerView } from '@/types/protocol'

interface HintBoardProps {
  hints: HintView[]
  players: PlayerView[]
  turnPlayerId?: string
  meId: string
}

/**
 * 이번 라운드에 나온 힌트 목록.
 *
 * 추리의 근거가 되는 유일한 기록이라 채팅과 분리해 항상 같은 자리에 남겨 둠. 채팅에 섞이면
 * 뒤로 밀려 올라가 버려서 나중에 다시 확인하기 어려움.
 */
export function HintBoard({ hints, players, turnPlayerId, meId }: HintBoardProps) {
  const nameOf = (playerId: string) =>
    players.find((player) => player.id === playerId)?.nickname ?? '알 수 없음'

  const waiting = players.filter(
    (player) => !player.abandoned && !hints.some((hint) => hint.playerId === player.id),
  ).length

  return (
    <Panel
      title="힌트"
      aside={
        <span className="tabular text-[0.7rem] text-bone-700">
          {hints.length} / {hints.length + waiting}
        </span>
      }
      bodyClassName="scroll-thin overflow-y-auto px-4 py-3"
    >
      {hints.length === 0 ? (
        <p className="py-6 text-center text-sm text-bone-700">
          {turnPlayerId ? '첫 번째 힌트를 기다리는 중' : '곧 힌트 순서가 시작됩니다'}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {hints.map((hint) => (
            <li key={hint.order} className="flex items-baseline gap-2.5 text-sm">
              <span className="tabular w-5 shrink-0 text-right text-xs text-lamp-700">
                {hint.order}
              </span>
              <span
                className="w-20 shrink-0 truncate text-xs"
                style={{
                  color: hint.playerId === meId ? 'var(--lamp-400)' : 'var(--bone-500)',
                }}
              >
                {nameOf(hint.playerId)}
              </span>
              <span
                className="font-display min-w-0 flex-1 text-base break-words"
                style={{ color: hint.passed ? 'var(--bone-700)' : 'var(--bone-100)' }}
              >
                {hint.passed ? '(시간 초과 — 말하지 못함)' : hint.text}
              </span>
            </li>
          ))}
        </ol>
      )}

      {turnPlayerId && (
        <p className="mt-3 border-t border-[var(--edge)] pt-2.5 text-xs text-bone-700">
          지금 차례:{' '}
          <span style={{ color: 'var(--lamp-400)' }}>
            {turnPlayerId === meId ? '당신' : nameOf(turnPlayerId)}
          </span>
        </p>
      )}
    </Panel>
  )
}
