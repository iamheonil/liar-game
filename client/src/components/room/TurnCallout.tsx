import type { PendingAction } from '@/lib/turn'

interface TurnCalloutProps {
  action: PendingAction
  /** 남은 초. 촉박함이 보여야 미루지 않음 */
  remaining: number | null
}

/**
 * 지금 당신이 무엇을 해야 하는지 알려 주는 안내.
 *
 * 입력창 바로 위에 붙어서 시선이 자연스럽게 아래로 내려가게 함. 처음 해 보는 사람에게는
 * "입력창이 생겼다"는 것만으로는 신호가 약해서, 문장으로 한 번 더 말해 줘야 알아챔.
 */
export function TurnCallout({ action, remaining }: TurnCalloutProps) {
  const urgent = remaining !== null && remaining <= 5

  return (
    <div
      className="turn-callout flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden className="turn-callout-dot shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="font-display text-base leading-tight font-bold text-lamp-400">
          {action.title}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-bone-300">{action.detail}</p>
      </div>

      {remaining !== null && (
        <span
          className="tabular shrink-0 text-2xl leading-none font-bold"
          style={{ color: urgent ? 'var(--blood-400)' : 'var(--lamp-400)' }}
        >
          {remaining}
        </span>
      )}
    </div>
  )
}
