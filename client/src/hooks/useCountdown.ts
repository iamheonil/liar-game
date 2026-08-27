import { useEffect, useState } from 'react'

/** 카운트다운 갱신 주기. 1초보다 짧게 잡아야 남은 초가 튀지 않고 자연스럽게 줄어듦 */
const TICK_MS = 200

/**
 * 서버가 알려 준 종료 시각까지 남은 초.
 *
 * 서버는 1초마다 시간을 밀어 주지 않고 "언제 끝나는지"만 한 번 알려 줌. 그 덕분에 트래픽이 거의
 * 없고, 대신 브라우저 시계가 어긋나 있으면 화면의 남은 시간이 실제와 달라짐. 스냅샷에 담겨 온
 * 서버 시각으로 그 오차를 보정함.
 *
 * @param endsAt 종료 시각(epoch ms). 제한이 없는 단계면 undefined
 * @param clockSkew 서버 시각 - 브라우저 시각
 */
export function useCountdown(endsAt: number | undefined, clockSkew: number): number | null {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (endsAt === undefined) {
      setRemaining(null)
      return
    }

    const compute = () => {
      const millisLeft = endsAt - (Date.now() + clockSkew)
      setRemaining(Math.max(0, Math.ceil(millisLeft / 1000)))
    }

    compute()
    const timer = window.setInterval(compute, TICK_MS)
    return () => window.clearInterval(timer)
  }, [endsAt, clockSkew])

  return remaining
}
