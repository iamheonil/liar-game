interface CountdownProps {
  seconds: number | null
  total: number
  label: string
  /** 되돌릴 수 없는 단계(투표·처형)에서는 붉게 표시해 긴장감을 줌 */
  urgent?: boolean
}

/**
 * 남은 시간 표시.
 *
 * 숫자만으로는 얼마나 급한지 감이 오지 않으므로 줄어드는 막대를 함께 보여 줌. 막대는 남은 비율을
 * 그대로 나타내고, 마지막 5초에는 색이 붉게 바뀌며 맥박처럼 뛰게 함.
 */
export function Countdown({ seconds, total, label, urgent = false }: CountdownProps) {
  if (seconds === null) return null

  const ratio = total > 0 ? Math.min(1, Math.max(0, seconds / total)) : 0
  const critical = seconds <= 5
  const barColor = critical || urgent ? 'var(--blood-500)' : 'var(--lamp-500)'

  return (
    <div className="flex flex-col gap-1.5" role="timer" aria-label={`${label} 남은 시간`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.7rem] tracking-[0.28em] text-bone-500 uppercase">{label}</span>
        <span
          className="tabular text-2xl leading-none font-bold"
          style={{ color: barColor, animation: critical ? 'pulse 1s ease-in-out infinite' : undefined }}
        >
          {seconds}
        </span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-ink-900">
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-linear"
          style={{ width: `${ratio * 100}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}
