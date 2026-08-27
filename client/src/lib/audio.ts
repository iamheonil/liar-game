/**
 * 소리.
 *
 * 음원 파일을 두지 않고 Web Audio 로 직접 만들어 씀. 이유가 셋 있음.
 *   1) 저작권을 따질 대상이 아예 생기지 않음
 *   2) 받아 올 파일이 없으니 첫 진입이 느려지지 않고 레포도 무거워지지 않음
 *   3) 심장박동이 남은 시간에 맞춰 실시간으로 빨라져야 하는데, 녹음된 루프로는 못 함
 *
 * 소리도 화면과 같은 세 갈래를 따름. 낮게 깔리는 드론이 어둠, 종소리가 등불, 타격음이 피.
 *
 * 브라우저는 사용자가 한 번이라도 화면을 건드리기 전에는 소리를 내주지 않음. 그래서 컨텍스트를
 * 미리 만들지 않고 첫 입력에서 열며(unlock), 그 전까지의 요청은 조용히 버림.
 */

/** 순간적으로 한 번 터지는 소리들 */
export type CueName =
  /** 단계가 바뀜 */
  | 'phase'
  /** 내 힌트 차례가 옴 */
  | 'turn'
  /** 누군가에게 표가 꽂힘 */
  | 'vote'
  /** 최다 득표자가 확정됨 */
  | 'accuse'
  /** 처형이 가결됨 */
  | 'execute'
  /** 라운드 결과 — 라이어 승 */
  | 'liar'
  /** 라운드 결과 — 시민 승 */
  | 'citizen'

export interface Ambience {
  /** 게임이 진행 중인가. 대기실과 결과 화면에서는 드론을 걷어 냄 */
  active: boolean
  /** 되돌릴 수 없는 단계인가. 드론이 열리며 불협이 섞임 */
  tense: boolean
}

/** 전체 음량. 게임 소리가 통화나 배경 음악을 덮지 않을 정도로 낮게 잡음 */
const MASTER_GAIN = 0.32
/** 드론 음량. 의식하면 들리지만 의식하지 않으면 안 들리는 선 */
const DRONE_GAIN = 0.06
/** 심장박동 간격의 하한. 이보다 빠르면 박동이 아니라 소음으로 들림 */
const MIN_BEAT_MS = 360

type WindowWithLegacyAudio = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let enabled = true

interface Drone {
  voices: OscillatorNode[]
  filter: BiquadFilterNode
  gain: GainNode
  air: AudioBufferSourceNode
}

let drone: Drone | null = null
let heartTimer: number | null = null
let heartMs: number | null = null

/**
 * 오디오 컨텍스트를 얻음. 아직 열 수 없거나 꺼져 있으면 null.
 *
 * 여기서 null 이 나오면 호출한 쪽은 그냥 아무 일도 하지 않음. 소리는 있으면 좋은 것이지
 * 없으면 게임이 진행되지 않는 것이 아니므로, 실패를 위로 전파하지 않음.
 */
function audio(): AudioContext | null {
  if (!enabled || !ctx || !master) return null
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 방의 공기. 백색보다 저역이 두터운 브라운 노이즈라 '쉭' 대신 '웅' 하고 깔림 */
function airBuffer(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const frames = Math.floor(context.sampleRate * 2)
  const buffer = context.createBuffer(1, frames, context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < frames; i += 1) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.4
  }
  noiseBuffer = buffer
  return buffer
}

/**
 * 짧은 음 하나.
 *
 * 게인을 0 으로 지수 램프하면 예외가 나므로 어디서든 0.0001 을 바닥으로 씀.
 */
function blip(
  context: AudioContext,
  options: {
    type: OscillatorType
    from: number
    to?: number
    gain: number
    at?: number
    attack?: number
    decay: number
  },
): void {
  const start = context.currentTime + (options.at ?? 0)
  const attack = options.attack ?? 0.008
  const osc = context.createOscillator()
  const gain = context.createGain()

  osc.type = options.type
  osc.frequency.setValueAtTime(options.from, start)
  if (options.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(options.to, start + options.decay)
  }

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(options.gain, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + options.decay)

  osc.connect(gain)
  gain.connect(master as GainNode)
  osc.start(start)
  osc.stop(start + options.decay + 0.04)
}

/** 노이즈를 짧게 끊어 만든 타격음. 문 닫히는 소리, 표가 꽂히는 소리에 씀 */
function hit(
  context: AudioContext,
  options: { cutoff: number; type: BiquadFilterType; gain: number; at?: number; decay: number },
): void {
  const start = context.currentTime + (options.at ?? 0)
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()

  source.buffer = airBuffer(context)
  source.loop = true
  filter.type = options.type
  filter.frequency.setValueAtTime(options.cutoff, start)

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(options.gain, start + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + options.decay)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(master as GainNode)
  source.start(start)
  source.stop(start + options.decay + 0.04)
}

/** 심장 한 번. 두 번 치는 것이 한 박이라 '쿵-쿵' 사이 간격이 중요함 */
function beat(context: AudioContext): void {
  blip(context, { type: 'sine', from: 92, to: 34, gain: 0.55, decay: 0.2 })
  blip(context, { type: 'sine', from: 78, to: 30, gain: 0.32, at: 0.19, decay: 0.22 })
}

/** 다음 한 번만 예약함. 예약 시점의 최신 간격을 읽으므로 가속이 매끄럽게 반영됨 */
function scheduleBeat(): void {
  if (heartMs === null) return
  heartTimer = window.setTimeout(() => {
    heartTimer = null
    if (heartMs === null) return
    const context = audio()
    if (context) beat(context)
    scheduleBeat()
  }, heartMs)
}

function startDrone(context: AudioContext): void {
  if (drone) return

  const gain = context.createGain()
  const filter = context.createBiquadFilter()

  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(190, context.currentTime)
  filter.Q.value = 0.7
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(DRONE_GAIN, context.currentTime + 2.6)

  // 아주 살짝 어긋난 두 음이 서로 맥놀이를 일으켜, 가만히 있어도 소리가 미세하게 흔들림
  const voices = [55, 55.4, 82.5].map((frequency, index) => {
    const osc = context.createOscillator()
    osc.type = index === 2 ? 'sine' : 'sawtooth'
    osc.frequency.setValueAtTime(frequency, context.currentTime)
    osc.connect(filter)
    osc.start()
    return osc
  })

  const air = context.createBufferSource()
  const airGain = context.createGain()
  air.buffer = airBuffer(context)
  air.loop = true
  airGain.gain.setValueAtTime(0.05, context.currentTime)
  air.connect(airGain)
  airGain.connect(filter)
  air.start()

  filter.connect(gain)
  gain.connect(master as GainNode)

  drone = { voices, filter, gain, air }
}

function stopDrone(): void {
  if (!drone || !ctx) return
  const at = ctx.currentTime
  const dying = drone
  drone = null

  dying.gain.gain.cancelScheduledValues(at)
  dying.gain.gain.setValueAtTime(Math.max(dying.gain.gain.value, 0.0001), at)
  dying.gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1)
  window.setTimeout(() => {
    dying.voices.forEach((osc) => osc.stop())
    dying.air.stop()
  }, 1400)
}

export const sound = {
  /**
   * 첫 사용자 입력에서 호출. 이 시점 전에는 어떤 브라우저도 소리를 내주지 않음.
   *
   * 여러 번 불려도 안전하며, 음소거 상태에서 켜질 때도 같은 경로를 지남.
   */
  unlock(): void {
    if (!enabled || ctx) return
    const Ctor = window.AudioContext ?? (window as WindowWithLegacyAudio).webkitAudioContext
    if (!Ctor) return
    try {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = MASTER_GAIN
      master.connect(ctx.destination)
      void ctx.resume()
    } catch {
      // 오디오를 열 수 없는 환경에서도 게임은 그대로 돌아가야 하므로 삼킴
      ctx = null
      master = null
    }
  },

  setEnabled(next: boolean): void {
    enabled = next
    if (next) {
      sound.unlock()
      return
    }
    sound.setHeartbeat(null)
    stopDrone()
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setValueAtTime(0, ctx.currentTime)
    }
  },

  /** 탭을 벗어나면 소리도 함께 물러남 */
  setMuffled(muffled: boolean): void {
    const context = audio()
    if (!context || !master) return
    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.linearRampToValueAtTime(muffled ? 0 : MASTER_GAIN, context.currentTime + 0.25)
  },

  setAmbience({ active, tense }: Ambience): void {
    const context = audio()
    if (!context) return

    if (!active) {
      stopDrone()
      return
    }

    startDrone(context)
    if (!drone) return

    // 긴장 단계에서는 저역 필터를 열어 소리를 앞으로 끌어냄. 화면이 붉어지는 것과 같은 신호
    const at = context.currentTime
    drone.filter.frequency.cancelScheduledValues(at)
    drone.filter.frequency.linearRampToValueAtTime(tense ? 430 : 190, at + 1.4)
    drone.gain.gain.cancelScheduledValues(at)
    drone.gain.gain.linearRampToValueAtTime(tense ? DRONE_GAIN * 1.5 : DRONE_GAIN, at + 1.4)
  },

  /**
   * 심장박동 간격(ms). null 이면 멈춤.
   *
   * 남은 시간이 줄수록 이 값이 짧아지며, 그 가속 자체가 긴장의 주된 전달자임.
   *
   * setInterval 로 두면 간격이 바뀔 때마다 타이머를 다시 걸어야 하는데, 남은 초는 1초마다
   * 바뀌고 박동 간격도 그만큼 자주 바뀌므로 매번 리셋되어 박동이 영영 오지 않음. 그래서 한 번
   * 칠 때마다 다음 한 번만 예약하고, 그 시점의 최신 간격을 읽게 함. 간격 변경은 다음 박동부터
   * 자연스럽게 반영되고 리듬이 끊기지 않음.
   */
  setHeartbeat(intervalMs: number | null): void {
    heartMs = intervalMs === null ? null : Math.max(MIN_BEAT_MS, Math.round(intervalMs))

    if (heartMs === null) {
      if (heartTimer !== null) {
        window.clearTimeout(heartTimer)
        heartTimer = null
      }
      return
    }

    if (heartTimer !== null) return

    const context = audio()
    if (!context) return
    beat(context)
    scheduleBeat()
  },

  cue(name: CueName): void {
    const context = audio()
    if (!context) return

    switch (name) {
      // 장면이 바뀌는 낮은 숨소리. 매 단계마다 울리므로 가장 조용해야 함
      case 'phase':
        hit(context, { type: 'lowpass', cutoff: 900, gain: 0.16, decay: 0.4 })
        blip(context, { type: 'sine', from: 160, to: 70, gain: 0.1, decay: 0.36 })
        break

      // 내 차례. 유일하게 밝은 소리라 다른 무엇과도 헷갈리지 않음
      case 'turn':
        blip(context, { type: 'sine', from: 880, gain: 0.16, decay: 0.5 })
        blip(context, { type: 'sine', from: 1320, gain: 0.07, at: 0.06, decay: 0.42 })
        break

      // 표가 꽂히는 마른 소리
      case 'vote':
        hit(context, { type: 'highpass', cutoff: 2400, gain: 0.1, decay: 0.07 })
        break

      // 지목 확정. 아래로 미끄러지는 음이 '결정되었다'는 인상을 줌
      case 'accuse':
        blip(context, { type: 'sawtooth', from: 320, to: 96, gain: 0.14, decay: 0.5 })
        hit(context, { type: 'lowpass', cutoff: 1400, gain: 0.2, decay: 0.3 })
        break

      // 처형 가결. 이 게임에서 가장 무거운 한 방
      case 'execute':
        blip(context, { type: 'sine', from: 130, to: 28, gain: 0.7, decay: 0.7 })
        hit(context, { type: 'lowpass', cutoff: 600, gain: 0.32, decay: 0.5 })
        break

      // 라이어 승. 단3도로 내려가 닫히는 느낌
      case 'liar':
        blip(context, { type: 'triangle', from: 392, gain: 0.16, decay: 0.5 })
        blip(context, { type: 'triangle', from: 311, gain: 0.16, at: 0.16, decay: 0.9 })
        break

      // 시민 승. 완전5도로 올라가 열리는 느낌
      case 'citizen':
        blip(context, { type: 'triangle', from: 392, gain: 0.15, decay: 0.5 })
        blip(context, { type: 'triangle', from: 587, gain: 0.15, at: 0.16, decay: 0.9 })
        break
    }
  },

  /** 방을 떠날 때 정리. 소켓과 마찬가지로 화면 수명 밖에 있으므로 명시적으로 꺼야 함 */
  dispose(): void {
    sound.setHeartbeat(null)
    stopDrone()
  },
}
