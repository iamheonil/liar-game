import { useCallback, useEffect, useState } from 'react'
import { sound } from '@/lib/audio'
import {
  loadMusicVolume,
  loadSfxVolume,
  loadSoundEnabled,
  saveMusicVolume,
  saveSfxVolume,
  saveSoundEnabled,
} from '@/lib/storage'

/**
 * 소리 설정. 켬/끔과 두 갈래의 음량.
 *
 * 연출 로직(useTension)과 떼어 둠. 저쪽은 "언제 무슨 소리를 낼지"를 정하고 여기는 "얼마나 크게
 * 낼지"만 정함. 설정 화면이 늘어나도 연출 코드가 같이 불어나지 않게 하려는 것.
 *
 * 세 값 모두 브라우저에 남으므로 다음에 들어와도 그대로임.
 */
export interface SoundSettings {
  enabled: boolean
  toggleEnabled: () => void
  /** 배경음(드론·심장박동) 0 ~ 1 */
  music: number
  setMusic: (level: number) => void
  /** 효과음(단계 전환·차례·투표·처형) 0 ~ 1 */
  sfx: number
  setSfx: (level: number) => void
}

export function useSoundSettings(): SoundSettings {
  const [enabled, setEnabled] = useState(loadSoundEnabled)
  const [music, setMusicState] = useState(loadMusicVolume)
  const [sfx, setSfxState] = useState(loadSfxVolume)

  /*
   * 브라우저는 사용자가 화면을 한 번 건드리기 전에는 소리를 내주지 않으므로 첫 입력을 붙잡음.
   * 소리를 껐다가 다시 켜는 경우에도 아직 컨텍스트가 열리지 않았을 수 있어 같은 길을 지남.
   */
  useEffect(() => {
    if (!enabled) return
    const open = () => sound.unlock()
    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    events.forEach((name) => window.addEventListener(name, open, { once: true, passive: true }))
    return () => events.forEach((name) => window.removeEventListener(name, open))
  }, [enabled])

  useEffect(() => {
    sound.setEnabled(enabled)
    // 껐다 켜면 컨텍스트가 새로 열릴 수 있으므로 음량을 다시 밀어 넣음
    if (enabled) {
      sound.setMusicVolume(music)
      sound.setSfxVolume(sfx)
    }
  }, [enabled, music, sfx])

  const toggleEnabled = useCallback(() => {
    setEnabled((on) => {
      saveSoundEnabled(!on)
      return !on
    })
  }, [])

  const setMusic = useCallback((level: number) => {
    setMusicState(level)
    saveMusicVolume(level)
    sound.setMusicVolume(level)
  }, [])

  const setSfx = useCallback((level: number) => {
    setSfxState(level)
    saveSfxVolume(level)
    sound.setSfxVolume(level)
  }, [])

  return { enabled, toggleEnabled, music, setMusic, sfx, setSfx }
}
