import { useState } from 'react'
import { Countdown } from '@/components/ui/Countdown'
import { PHASE_META } from '@/lib/phase'
import type { RoomView } from '@/types/protocol'

interface RoomHeaderProps {
  room: RoomView
  remaining: number | null
  connected: boolean
  canLeave: boolean
  onLeave: () => void
  soundOn: boolean
  onToggleSound: () => void
}

/**
 * 소리 켬/끔 아이콘.
 *
 * 이 게임은 이미지 파일을 하나도 쓰지 않으므로 아이콘도 선으로 직접 그림.
 */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8 h3 l4 -3.2 v10.4 l-4 -3.2 h-3 z" />
      {on ? (
        <>
          <path d="M13.6 7.2 a3.8 3.8 0 0 1 0 5.6" />
          <path d="M15.9 5 a7 7 0 0 1 0 10" />
        </>
      ) : (
        <path d="M14 8 l4 4 M18 8 l-4 4" />
      )}
    </svg>
  )
}

/**
 * 지금이 몇 라운드의 어느 단계인지, 얼마나 남았는지를 항상 같은 자리에서 보여 줌.
 *
 * 화면 높이가 고정되어 있어 여기서 쓰는 만큼 아래 좌석과 대화가 줄어듦. 그래서 두 줄로 못박음.
 * 방 이름 줄은 게임 중에는 거의 볼 일이 없으므로 작게 두고, 단계와 남은 시간만 크게 남김.
 *
 * 예전에는 단계별 안내 문구도 여기 있었는데, 하단 입력 바가 같은 말을 다시 하고 있었음.
 * "지금 할 수 있는 행동은 하단 바 하나만 본다"는 규칙에 맞춰 그쪽에 맡기고 여기서는 지움.
 */
export function RoomHeader({
  room,
  remaining,
  connected,
  canLeave,
  onLeave,
  soundOn,
  onToggleSound,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)
  const meta = room.game ? PHASE_META[room.game.phase] : null

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // 클립보드 권한이 없는 브라우저도 있어 실패는 무시하고 주소창 공유에 맡김
    }
  }

  return (
    <header className="panel flex flex-col gap-1.5 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="font-display truncate text-sm font-bold text-bone-100">{room.title}</h1>
          <button
            type="button"
            onClick={copyInvite}
            className="shrink-0 text-[0.68rem] tracking-[0.16em] text-lamp-600 transition-colors hover:text-lamp-400"
            title="초대 링크 복사"
          >
            {copied ? '복사됨' : room.roomId}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSound}
            className="btn btn-ghost min-h-0 px-1.5 py-1"
            style={{ color: soundOn ? 'var(--lamp-600)' : 'var(--bone-700)' }}
            aria-pressed={soundOn}
            title={soundOn ? '소리 끄기' : '소리 켜기'}
          >
            <SpeakerIcon on={soundOn} />
          </button>
          <span
            className="h-2 w-2 rounded-full"
            title={connected ? '연결됨' : '연결 끊김 — 자동으로 다시 시도 중'}
            style={{ background: connected ? 'var(--lamp-500)' : 'var(--blood-500)' }}
          />
          {canLeave && (
            <button
              type="button"
              className="btn btn-ghost min-h-0 px-1.5 py-1 text-xs"
              onClick={onLeave}
            >
              나가기
            </button>
          )}
        </div>
      </div>

      {room.game && meta && (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate">
            <span className="tabular mr-2 text-[0.7rem] text-bone-700">
              {room.game.round}/{room.game.totalRounds}
            </span>
            <span
              className="font-display text-lg font-bold"
              style={{ color: meta.tense ? 'var(--blood-400)' : 'var(--lamp-400)' }}
            >
              {meta.label}
            </span>
          </p>
          <div className="w-24 shrink-0">
            <Countdown
              seconds={remaining}
              total={meta.durationSeconds}
              label="남은 시간"
              urgent={meta.tense}
              compact
            />
          </div>
        </div>
      )}
    </header>
  )
}
