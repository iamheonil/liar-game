import { useState } from 'react'
import type { GameResultView } from '@/types/protocol'

interface GameResultOverlayProps {
  result: GameResultView
  meId: string
  isHost: boolean
  onReturnToLobby: () => void
}

const RANK_COLOR = ['var(--lamp-400)', 'var(--bone-300)', 'var(--lamp-700)']

/**
 * 게임 전체 결과.
 *
 * 잠시 뒤 서버가 자동으로 대기실로 되돌리지만, 그전에 순위와 라운드별 정답을 훑어볼 수 있게 함.
 * 접어 두면 아래 채팅으로 감상을 나눌 수 있음.
 */
export function GameResultOverlay({
  result,
  meId,
  isHost,
  onReturnToLobby,
}: GameResultOverlayProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        type="button"
        className="btn btn-primary fixed right-4 bottom-24 z-40"
        onClick={() => setCollapsed(false)}
      >
        결과 다시 보기
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/85 px-4 py-8 backdrop-blur-sm">
      <div className="panel scroll-thin flex max-h-full w-full max-w-md flex-col overflow-y-auto px-5 py-6">
        <p className="eyebrow text-center">GAME OVER</p>
        <h2 className="font-display mt-1 text-center text-3xl font-bold text-lamp-400">최종 순위</h2>

        <ol className="mt-5 flex flex-col gap-2">
          {result.ranking.map((entry, index) => (
            <li
              key={entry.playerId}
              className="panel-flat flex items-center gap-3 px-3 py-2.5"
              style={{
                borderColor: entry.playerId === meId ? 'var(--lamp-600)' : 'var(--edge)',
              }}
            >
              <span
                className="tabular w-7 text-center text-xl font-bold"
                style={{ color: RANK_COLOR[Math.min(index, RANK_COLOR.length - 1)] }}
              >
                {entry.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-bone-100">
                {entry.nickname}
                {entry.playerId === meId && <span className="ml-1 text-xs text-bone-700">나</span>}
              </span>
              <span className="tabular text-base font-bold text-lamp-400">{entry.score}점</span>
            </li>
          ))}
        </ol>

        <div className="rule my-5" />

        <h3 className="eyebrow">라운드 기록</h3>
        <ul className="mt-2.5 flex flex-col gap-1.5 text-xs">
          {result.rounds.map((round) => (
            <li key={round.round} className="flex items-baseline gap-2 text-bone-500">
              <span className="tabular w-4 text-lamp-700">{round.round}</span>
              <span className="w-14 truncate text-bone-700">{round.category}</span>
              <span className="font-display flex-1 truncate text-sm text-bone-300">
                {round.citizenWord}
              </span>
              <span
                style={{
                  color: round.winner === 'LIAR' ? 'var(--blood-400)' : 'var(--lamp-500)',
                }}
              >
                {round.winner === 'LIAR' ? '라이어' : round.winner === 'CITIZEN' ? '시민' : '무효'}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex gap-2">
          <button type="button" className="btn flex-1" onClick={() => setCollapsed(true)}>
            접기
          </button>
          {isHost && (
            <button type="button" className="btn btn-primary flex-1" onClick={onReturnToLobby}>
              대기실로
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
