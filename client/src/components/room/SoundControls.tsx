import { useEffect, useId, useRef, useState } from 'react'
import type { SoundSettings } from '@/hooks/useSoundSettings'

interface SoundControlsProps {
  settings: SoundSettings
}

/**
 * 소리 켬/끔 아이콘.
 *
 * 이 게임은 이미지 파일을 하나도 쓰지 않으므로 아이콘도 선으로 직접 그림. 음량이 0 이면 꺼진
 * 것과 들리는 결과가 같으므로 아이콘도 같은 모양으로 둠 — 소리가 안 나는데 켜진 아이콘이
 * 떠 있으면 고장으로 보임.
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

interface SliderProps {
  label: string
  hint: string
  value: number
  disabled: boolean
  onChange: (level: number) => void
}

function VolumeSlider({ label, hint, value, disabled, onChange }: SliderProps) {
  const id = useId()
  const percent = Math.round(value * 100)

  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs text-bone-300">
          {label}
        </label>
        <span className="tabular text-[0.65rem] text-bone-700">{percent}</span>
      </div>
      <input
        id={id}
        type="range"
        className="slider mt-1.5"
        min={0}
        max={100}
        step={5}
        value={percent}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
      <p className="mt-1 text-[0.65rem] text-bone-700">{hint}</p>
    </div>
  )
}

/**
 * 소리 설정 꾸러미.
 *
 * 스피커 단추를 누르면 켬/끔과 두 개의 손잡이가 함께 열림. 예전에는 단추가 곧바로 음소거를
 * 걸었는데, 그러면 "조금만 줄이고 싶다"는 사람에게 줄 수 있는 선택이 전부 아니면 전무뿐이었음.
 *
 * 배경음과 효과음을 따로 두는 이유는, 깔려 있는 소리는 부담스러워도 결정의 순간을 알려 주는
 * 소리는 남기고 싶은 사람이 있기 때문임. 한 손잡이로 묶으면 그 선택을 할 수 없음.
 *
 * 게임 화면은 높이가 고정되어 있어 이런 설정이 본문에 자리를 얻을 수 없음. 그래서 겹쳐 띄우고,
 * 바깥을 누르거나 Esc 를 누르면 닫음.
 */
export function SoundControls({ settings }: SoundControlsProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const audible = settings.enabled && (settings.music > 0 || settings.sfx > 0)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="btn btn-ghost min-h-0 px-1.5 py-1"
        style={{ color: audible ? 'var(--lamp-600)' : 'var(--bone-700)' }}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="소리 설정"
      >
        <SpeakerIcon on={audible} />
      </button>

      {/*
        자리 잡기와 겉모습을 두 겹으로 나눠 둠. .panel 이 position: relative 를 들고 있고
        타일윈드의 absolute 와 특정도가 같아서, 한 요소에 둘을 같이 주면 나중에 정의된 .panel 이
        이겨 팝오버가 흐름에 남아 버림 — 머리글이 통째로 밀려남. 바깥 겹은 .panel 을 쓰지 않아
        그 다툼 자체가 없음.
      */}
      {open && (
        <div className="absolute top-full right-0 z-50 pt-2">
          <div
            role="dialog"
            aria-label="소리 설정"
            className="panel flex w-60 flex-col gap-3 px-3.5 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="eyebrow">소리</h3>
              <button
                type="button"
                onClick={settings.toggleEnabled}
                className={`btn min-h-0 px-2 py-1 text-xs ${settings.enabled ? '' : 'btn-primary'}`}
                aria-pressed={!settings.enabled}
              >
                {settings.enabled ? '음소거' : '음소거 해제'}
              </button>
            </div>

            <div className="rule" />

            <VolumeSlider
              label="배경음"
              hint="깔리는 소리와 심장박동"
              value={settings.music}
              disabled={!settings.enabled}
              onChange={settings.setMusic}
            />

            <VolumeSlider
              label="효과음"
              hint="단계 전환·내 차례·투표·처형"
              value={settings.sfx}
              disabled={!settings.enabled}
              onChange={settings.setSfx}
            />

            <p className="text-[0.65rem] text-bone-700">이 설정은 이 브라우저에 저장됩니다.</p>
          </div>
        </div>
      )}
    </div>
  )
}
