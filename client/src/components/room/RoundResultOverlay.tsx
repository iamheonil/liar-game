import { PHASE_META } from '@/lib/phase'
import type { PlayerView, RoundEnding, RoundResultView } from '@/types/protocol'

interface RoundResultOverlayProps {
  result: RoundResultView
  players: PlayerView[]
  meId: string
  /** 다음 라운드까지 남은 초. 언제 닫히는지 보여 줘야 조급해하지 않음 */
  remaining: number | null
}

const VERDICT: Record<string, { title: string; sub: string; color: string; tint: string }> = {
  CITIZEN: {
    title: '시민 승리',
    sub: '라이어를 찾아냈습니다',
    color: 'var(--lamp-400)',
    tint: 'color-mix(in oklab, var(--lamp-500) 16%, transparent)',
  },
  LIAR: {
    title: '라이어 승리',
    sub: '끝까지 들키지 않았습니다',
    color: 'var(--blood-400)',
    tint: 'color-mix(in oklab, var(--blood-500) 20%, transparent)',
  },
  NONE: {
    title: '라운드 무효',
    sub: '라이어가 자리를 떠났습니다',
    color: 'var(--bone-500)',
    tint: 'color-mix(in oklab, var(--bone-700) 18%, transparent)',
  },
}

/**
 * 라운드가 끝나는 순간에만 정답과 라이어 정체를 공개함.
 *
 * 진행 중에는 서버가 이 정보를 아예 내려보내지 않기 때문에, 개발자 도구를 열어도 미리 알 수 없음.
 *
 * 여기서 한 판이 정리되므로 "누가 라이어였고 무슨 일이 있었는지"가 한눈에 들어와야 함. 승패만
 * 띄우면 처음 하는 사람은 자기가 왜 이겼는지도 모른 채 다음 라운드로 넘어감.
 */
export function RoundResultOverlay({ result, players, meId, remaining }: RoundResultOverlayProps) {
  const nameOf = (playerId?: string | null) =>
    players.find((player) => player.id === playerId)?.nickname ?? '알 수 없음'

  const verdict = VERDICT[result.winner] ?? VERDICT.NONE
  const liar = players.find((player) => player.id === result.liarId)
  const citizens = players.filter((player) => player.id !== result.liarId)
  const iAmLiar = result.liarId === meId
  const myPoint = result.awardedPoints[meId] ?? 0
  // 편 승패와 내 승패는 다름. 라이어가 이겼는데 내가 시민이면 나는 진 것임
  const iWon = result.winner === 'NONE' ? null : (result.winner === 'LIAR') === iAmLiar

  const total = PHASE_META.ROUND_RESULT.durationSeconds
  const ratio = remaining === null ? 0 : Math.min(1, Math.max(0, remaining / total))

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/85 px-4 py-6 backdrop-blur-sm">
      <div className="panel scroll-thin flex max-h-full w-full max-w-md flex-col overflow-y-auto px-5 py-5">
        {/* 어느 편이 이겼는지가 가장 먼저 눈에 들어와야 함. 나머지는 그 이유를 설명하는 부연임 */}
        <div
          className="rounded-[var(--radius-md)] px-4 py-3.5 text-center"
          style={{ background: verdict.tint, border: `1px solid ${verdict.color}` }}
        >
          <h2 className="font-display text-3xl leading-none font-bold" style={{ color: verdict.color }}>
            {verdict.title}
          </h2>
          <p className="mt-1.5 text-xs text-bone-500">{verdict.sub}</p>
          {iWon !== null && (
            <p
              className="mt-2.5 text-sm font-bold"
              style={{ color: iWon ? 'var(--lamp-400)' : 'var(--bone-700)' }}
            >
              {iWon ? '나는 이겼습니다' : '나는 졌습니다'}
            </p>
          )}
        </div>
        <p className="eyebrow mt-3 text-center">
          ROUND {result.round} · {result.category}
        </p>

        <div className="rule my-4" />

        {/* 두 단어를 나란히 놓아야 라이어가 왜 헤맸는지가 바로 보임 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="panel-flat px-3 py-2.5 text-center">
            <p className="text-[0.65rem] tracking-[0.2em] text-bone-700">제시어</p>
            <p className="font-display mt-1 text-lg leading-tight font-bold text-lamp-400">
              {result.citizenWord}
            </p>
          </div>
          <div className="panel-flat px-3 py-2.5 text-center" style={{ borderColor: 'var(--blood-600)' }}>
            <p className="text-[0.65rem] tracking-[0.2em] text-bone-700">라이어가 받은 단어</p>
            <p className="font-display mt-1 text-lg leading-tight font-bold" style={{ color: 'var(--blood-400)' }}>
              {result.liarWord}
            </p>
          </div>
        </div>

        <div className="rule my-4" />

        {/* 정체 공개 */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-bone-700">라이어</span>
            <span
              className="rounded-[var(--radius-sm)] px-2 py-1 text-sm font-bold"
              style={{ background: 'var(--blood-700)', color: 'var(--bone-100)' }}
            >
              {liar?.nickname ?? '알 수 없음'}
              {iAmLiar && ' (나)'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-12 shrink-0 pt-1 text-xs text-bone-700">시민</span>
            <div className="flex flex-wrap gap-1.5">
              {citizens.map((player) => (
                <span
                  key={player.id}
                  className="panel-flat px-2 py-1 text-xs"
                  style={{ color: player.id === meId ? 'var(--lamp-400)' : 'var(--bone-300)' }}
                >
                  {player.nickname}
                  {player.id === meId && ' (나)'}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rule my-4" />

        {/* 경과 — 무슨 일이 있었는지 순서대로 */}
        <h3 className="eyebrow">경과</h3>
        <ol className="mt-2 flex flex-col gap-1.5">
          {storyOf(result, nameOf).map((line, index) => (
            <li key={index} className="flex gap-2 text-sm text-bone-300">
              <span className="tabular w-4 shrink-0 text-right text-xs text-lamp-700">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">{line}</span>
            </li>
          ))}
        </ol>

        {Object.keys(result.awardedPoints).length > 0 && (
          <>
            <div className="rule my-4" />
            <h3 className="eyebrow">획득 점수</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(result.awardedPoints).map(([playerId, point]) => (
                <span
                  key={playerId}
                  className="panel-flat px-2 py-1 text-xs"
                  style={{
                    borderColor: playerId === meId ? 'var(--lamp-600)' : 'var(--edge)',
                    color: playerId === meId ? 'var(--lamp-400)' : 'var(--bone-300)',
                  }}
                >
                  {nameOf(playerId)} +{point}
                </span>
              ))}
            </div>
          </>
        )}

        {myPoint > 0 && (
          <p className="mt-3 text-center text-sm font-bold" style={{ color: 'var(--lamp-400)' }}>
            +{myPoint}점 획득
          </p>
        )}

        {/* 언제 닫히는지 보여 줌. 갑자기 사라지면 읽던 사람이 당황함 */}
        {remaining !== null && (
          <div className="mt-5">
            <p className="text-center text-xs text-bone-700">{remaining}초 후 다음으로</p>
            <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-ink-900">
              <div
                className="h-full rounded-full transition-[width] duration-200 ease-linear"
                style={{ width: `${ratio * 100}%`, backgroundColor: 'var(--lamp-600)' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 라운드가 어떻게 흘러갔는지를 문장으로 풀어냄.
 *
 * 서버가 종료 사유를 따로 보내 주기 때문에 "부결로 살아남음"과 "시민을 잘못 처형함"을 구분해서
 * 쓸 수 있음. 둘 다 라이어 승리지만 플레이어 입장에서는 완전히 다른 이야기임.
 */
function storyOf(
  result: RoundResultView,
  nameOf: (playerId?: string | null) => string,
): string[] {
  const accused = result.accusedId ? nameOf(result.accusedId) : null
  const ending: RoundEnding = result.ending

  switch (ending) {
    case 'ABORTED':
      return ['라이어의 연결이 끊겨 라운드가 무효 처리되었습니다.']

    case 'NO_MAJORITY':
      return [
        '과반을 넘긴 득표자가 없어 아무도 지목되지 않았습니다.',
        '라이어가 그대로 살아남았습니다.',
      ]

    case 'ACQUITTED':
      return accused
        ? [
            `${accused} 님이 최다 득표로 지목되었습니다.`,
            '최후 투표에서 처형이 부결되었습니다.',
            '라이어가 살아남았습니다.',
          ]
        : ['지목된 사람이 자리를 떠나 라운드가 끝났습니다.', '라이어가 살아남았습니다.']

    case 'WRONG_EXECUTION':
      return [
        `${accused ?? '한 명'} 님이 최다 득표로 지목되었습니다.`,
        `${accused ?? '그 사람'} 님을 처형했지만 시민이었습니다.`,
        '라이어가 살아남았습니다.',
      ]

    case 'LIAR_EXECUTED': {
      const lines = [
        `${accused ?? '한 명'} 님이 최다 득표로 지목되었습니다.`,
        `${accused ?? '그 사람'} 님을 처형했고, 라이어가 맞았습니다.`,
      ]
      lines.push(
        result.liarGuess
          ? `라이어가 제시어를 "${result.liarGuess}" 라고 추측했습니다 — ${
              result.liarGuessCorrect ? '정답' : '오답'
            }.`
          : '라이어가 시간 안에 제시어를 대지 못했습니다.',
      )
      lines.push(
        result.liarGuessCorrect
          ? '제시어를 맞혀 라이어가 역전했습니다.'
          : '시민이 이겼습니다.',
      )
      return lines
    }
  }
}
