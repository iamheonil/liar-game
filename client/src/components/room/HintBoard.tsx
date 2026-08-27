import { Panel } from '@/components/ui/Panel'
import type { HintView, PlayerView } from '@/types/protocol'

interface HintListProps {
  hints: HintView[]
  players: PlayerView[]
  turnPlayerId?: string
  meId: string
}

interface HintBoardProps extends HintListProps {
  className?: string
}

/** 아직 힌트를 내지 않은 사람 수. 남은 순서를 가늠하는 데 씀 */
export function pendingHintCount(hints: HintView[], players: PlayerView[]): number {
  return players.filter(
    (player) => !player.abandoned && !hints.some((hint) => hint.playerId === player.id),
  ).length
}

/**
 * 힌트 목록 본문.
 *
 * 좁은 화면에서는 대화와 한 자리를 탭으로 나눠 쓰고, 넓은 화면에서는 자기 패널을 가짐. 그래서
 * 껍데기(패널·스크롤)는 밖에 맡기고 여기서는 내용만 그림.
 */
export function HintList({ hints, players, turnPlayerId, meId }: HintListProps) {
  const nameOf = (playerId: string) =>
    players.find((player) => player.id === playerId)?.nickname ?? '알 수 없음'

  return (
    <>
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
    </>
  )
}

/**
 * 이번 라운드에 나온 힌트 목록.
 *
 * 추리의 근거가 되는 유일한 기록이라 채팅과 분리해 항상 같은 자리에 남겨 둠. 채팅에 섞이면
 * 뒤로 밀려 올라가 버려서 나중에 다시 확인하기 어려움.
 */
export function HintBoard({ className = '', ...list }: HintBoardProps) {
  return (
    <Panel
      title="힌트"
      className={className}
      aside={
        <span className="tabular text-[0.7rem] text-bone-700">
          {list.hints.length} / {list.hints.length + pendingHintCount(list.hints, list.players)}
        </span>
      }
      bodyClassName="scroll-thin overflow-y-auto px-4 py-3"
    >
      <HintList {...list} />
    </Panel>
  )
}
