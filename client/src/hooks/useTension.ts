import { useEffect, useRef, useState } from 'react'
import { sound } from '@/lib/audio'
import { PHASE_META } from '@/lib/phase'
import type { RoomView } from '@/types/protocol'

/**
 * 긴장 연출을 한곳에서 관장함.
 *
 * 기존 연출은 전부 '상태'에만 반응했음. 투표 단계에 있는 동안 화면이 붉지만, 투표 단계로 넘어가는
 * 순간에는 아무 일도 일어나지 않았음. 그래서 게임에서 가장 심장이 뛰는 지점들 — 지목이 확정되는
 * 순간, 처형이 가결되는 순간, 라이어가 밝혀지는 순간 — 이 전부 조용히 지나갔음.
 *
 * 이 훅은 서버 스냅샷을 이전 값과 비교해 '순간'을 찾아내고, 그 순간에만 번쩍임과 소리를 한 번씩
 * 터뜨림. 판정은 여전히 서버가 하고 여기서는 바뀐 지점을 읽기만 하므로, 연출이 게임 진행에
 * 영향을 줄 여지가 없음.
 *
 * 켬/끔과 음량은 여기서 다루지 않음. "언제 무슨 소리를 낼지"와 "얼마나 크게 낼지"는 서로
 * 다른 관심사라 useSoundSettings 로 갈라 두었음.
 */

/** 심장박동이 가장 느릴 때와 가장 빠를 때의 간격(ms) */
const BEAT_SLOWEST_MS = 1020
const BEAT_FASTEST_MS = 400
/** 이 초를 남기고부터 박동이 빨라지기 시작함 */
const BEAT_RAMP_FROM = 20
/** 화면 가장자리가 붉게 맥박치기 시작하는 남은 초 */
const DREAD_FROM = 10

export type FlashTone = 'lamp' | 'blood'

export interface Tension {
  /** 값이 바뀔 때마다 빛이 한 번 번짐. 리마운트로 애니메이션을 다시 시작시키는 열쇠 */
  flashKey: number
  flashTone: FlashTone
  /** 값이 바뀔 때마다 전구가 한 번 흔들림 */
  shakeKey: number
  /** 화면 가장자리가 붉게 맥박쳐야 하는가 */
  dread: boolean
  /** 맥박 주기(ms). 심장박동 소리와 같은 값을 써서 눈과 귀가 어긋나지 않게 함 */
  beatMs: number
}

export function useTension(room: RoomView | null, meId: string, remaining: number | null): Tension {
  const [flashKey, setFlashKey] = useState(0)
  const [flashTone, setFlashTone] = useState<FlashTone>('lamp')
  const [shakeKey, setShakeKey] = useState(0)

  // 첫 스냅샷은 '변화'가 아니라 '현재 상태'이므로 연출하지 않음. 재접속했다고 처형음이 울리면 곤란함
  const primed = useRef(false)
  const prevPhase = useRef<string | undefined>(undefined)
  const prevTurn = useRef<string | undefined>(undefined)
  const prevVotes = useRef(0)

  const game = room?.game
  const phase = game?.phase
  const meta = phase ? PHASE_META[phase] : null
  const tense = meta?.tense ?? false

  // 탭을 벗어나면 소리도 함께 물러남. 뒤에서 계속 울리는 드론만큼 성가신 것이 없음
  useEffect(() => {
    const follow = () => sound.setMuffled(document.hidden)
    document.addEventListener('visibilitychange', follow)
    return () => {
      document.removeEventListener('visibilitychange', follow)
      sound.setMuffled(false)
    }
  }, [])

  useEffect(() => () => sound.dispose(), [])

  /* ------------------------------------------------------------ 단계 전이 */

  useEffect(() => {
    if (!phase) {
      prevPhase.current = undefined
      prevTurn.current = undefined
      prevVotes.current = 0
      primed.current = false
      return
    }

    if (prevPhase.current === phase) return
    const first = !primed.current
    prevPhase.current = phase
    primed.current = true

    if (first) {
      // 재접속으로 게임 도중에 합류한 경우. 지금 보이는 것은 '변화'가 아니라 '현재 상태'이므로
      // 차례 알림이나 투표음이 뒤늦게 터지지 않도록 비교 기준만 맞춰 두고 조용히 지나감.
      // 이 효과는 아래 두 효과보다 먼저 선언되어 같은 커밋에서 먼저 실행되므로 여기서 막을 수 있음
      prevTurn.current = game?.turnPlayerId
      prevVotes.current = Object.keys(game?.votes ?? {}).length
      return
    }

    setFlashKey((key) => key + 1)
    setFlashTone(PHASE_META[phase].tense ? 'blood' : 'lamp')

    switch (phase) {
      // 최다 득표자가 정해져 최후 진술로 넘어온 순간
      case 'DEFENSE':
        sound.cue('accuse')
        setShakeKey((key) => key + 1)
        break

      // 여기까지 왔다는 것은 처형이 가결되었고 그 사람이 라이어였다는 뜻
      case 'LIAR_GUESS':
        sound.cue('execute')
        setShakeKey((key) => key + 1)
        break

      case 'ROUND_RESULT':
        sound.cue(game?.lastRound?.winner === 'CITIZEN' ? 'citizen' : 'liar')
        break

      default:
        sound.cue('phase')
    }
    // lastRound 는 ROUND_RESULT 로 넘어오는 스냅샷에 함께 실려 오므로 의존성에 둘 필요가 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ------------------------------------------------- 내 차례 · 표가 꽂힘 */

  useEffect(() => {
    const turn = game?.turnPlayerId
    if (prevTurn.current === turn) return
    prevTurn.current = turn
    if (primed.current && turn && turn === meId) {
      sound.cue('turn')
      // 힌트 단계는 발언자가 바뀌어도 단계는 그대로라 위쪽 단계 전이 효과가 돌지 않음.
      // 자기 차례가 온 것은 놓치면 안 되는 순간이라 여기서 한 번 더 번쩍여 줌
      setFlashTone('lamp')
      setFlashKey((key) => key + 1)
    }
  }, [game?.turnPlayerId, meId])

  useEffect(() => {
    const count = Object.keys(game?.votes ?? {}).length
    if (count > prevVotes.current && primed.current) sound.cue('vote')
    prevVotes.current = count
  }, [game?.votes])

  /* ---------------------------------------------------- 드론과 심장박동 */

  const playing = room?.status === 'PLAYING' && phase !== 'GAME_RESULT'

  useEffect(() => {
    sound.setAmbience({ active: Boolean(playing), tense })
  }, [playing, tense])

  // 남은 시간이 줄수록 박동이 빨라짐. 이 가속 자체가 긴장을 전달하는 주된 수단임
  const beating = tense && remaining !== null
  const ratio = beating ? Math.min(remaining, BEAT_RAMP_FROM) / BEAT_RAMP_FROM : 1
  // 100ms 단위로 끊음. 화면의 맥박도 같은 값을 애니메이션 주기로 쓰는데, 매번 미세하게 달라지면
  // CSS 애니메이션이 계속 다시 계산되어 오히려 덜컹거림
  const beatMs =
    Math.round((BEAT_FASTEST_MS + (BEAT_SLOWEST_MS - BEAT_FASTEST_MS) * ratio) / 100) * 100

  useEffect(() => {
    sound.setHeartbeat(beating ? beatMs : null)
  }, [beating, beatMs])

  return {
    flashKey,
    flashTone,
    shakeKey,
    dread: beating && remaining !== null && remaining <= DREAD_FROM,
    beatMs,
  }
}
