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
}

/** 지금이 몇 라운드의 어느 단계인지, 얼마나 남았는지를 항상 같은 자리에서 보여 줌. */
export function RoomHeader({ room, remaining, connected, canLeave, onLeave }: RoomHeaderProps) {
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
    <header className="panel flex flex-col gap-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display truncate text-lg font-bold text-bone-100">{room.title}</h1>
          <button
            type="button"
            onClick={copyInvite}
            className="mt-0.5 text-xs tracking-[0.2em] text-lamp-600 transition-colors hover:text-lamp-400"
            title="초대 링크 복사"
          >
            {copied ? '링크 복사됨' : room.roomId}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            title={connected ? '연결됨' : '연결 끊김 — 자동으로 다시 시도 중'}
            style={{ background: connected ? 'var(--lamp-500)' : 'var(--blood-500)' }}
          />
          {canLeave && (
            <button type="button" className="btn btn-ghost px-2 text-xs" onClick={onLeave}>
              나가기
            </button>
          )}
        </div>
      </div>

      {room.game && meta && (
        <>
          <div className="rule" />
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[0.7rem] tracking-[0.2em] text-bone-700">
                ROUND {room.game.round} / {room.game.totalRounds}
              </p>
              <p
                className="font-display text-xl font-bold"
                style={{ color: meta.tense ? 'var(--blood-400)' : 'var(--lamp-400)' }}
              >
                {meta.label}
              </p>
            </div>
            <div className="w-32 shrink-0">
              <Countdown
                seconds={remaining}
                total={meta.durationSeconds}
                label="남은 시간"
                urgent={meta.tense}
              />
            </div>
          </div>
          {meta.hint && <p className="text-xs text-bone-500">{meta.hint}</p>}
        </>
      )}
    </header>
  )
}
