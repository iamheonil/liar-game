import type { PlayerView, RoundResultView } from '@/types/protocol'

interface RoundResultOverlayProps {
  result: RoundResultView
  players: PlayerView[]
  meId: string
}

const WINNER_TEXT: Record<string, { title: string; color: string }> = {
  CITIZEN: { title: '시민 승리', color: 'var(--lamp-400)' },
  LIAR: { title: '라이어 승리', color: 'var(--blood-400)' },
  NONE: { title: '라운드 무효', color: 'var(--bone-500)' },
}

/**
 * 라운드가 끝나는 순간에만 정답과 라이어 정체를 공개함.
 *
 * 진행 중에는 서버가 이 정보를 아예 내려보내지 않기 때문에, 개발자 도구를 열어도 미리 알 수 없음.
 */
export function RoundResultOverlay({ result, players, meId }: RoundResultOverlayProps) {
  const nameOf = (playerId?: string) =>
    players.find((player) => player.id === playerId)?.nickname ?? '없음'
  const verdict = WINNER_TEXT[result.winner] ?? WINNER_TEXT.NONE
  const myPoint = result.awardedPoints[meId] ?? 0

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="panel w-full max-w-sm px-5 py-6 text-center">
        <p className="eyebrow">ROUND {result.round} · {result.category}</p>
        <h2
          className="font-display mt-1 text-3xl font-bold"
          style={{ color: verdict.color }}
        >
          {verdict.title}
        </h2>

        <div className="rule my-4" />

        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-bone-700">제시어</dt>
            <dd className="font-display text-lg font-bold text-lamp-400">{result.citizenWord}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-bone-700">라이어가 받은 단어</dt>
            <dd className="font-display text-base text-bone-300">{result.liarWord}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-bone-700">라이어</dt>
            <dd className="text-base font-bold" style={{ color: 'var(--blood-400)' }}>
              {nameOf(result.liarId)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-bone-700">투표 결과</dt>
            <dd className="text-bone-300">
              {result.accusedId
                ? result.liarCaught
                  ? `${nameOf(result.accusedId)} 처형 — 적중`
                  : `${nameOf(result.accusedId)} 처형 — 빗나감`
                : '지목 실패'}
            </dd>
          </div>
          {result.liarGuess && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-bone-700">라이어의 추측</dt>
              <dd style={{ color: result.liarGuessCorrect ? 'var(--blood-400)' : 'var(--bone-500)' }}>
                {result.liarGuess} {result.liarGuessCorrect ? '(정답)' : '(오답)'}
              </dd>
            </div>
          )}
        </dl>

        {myPoint > 0 && (
          <p className="mt-4 text-sm font-bold" style={{ color: 'var(--lamp-400)' }}>
            +{myPoint}점 획득
          </p>
        )}
      </div>
    </div>
  )
}
