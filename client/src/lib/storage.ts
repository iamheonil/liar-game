import type { JoinTicket } from '@/types/protocol'

/**
 * 브라우저에 보관하는 정보.
 *
 * 닉네임은 다음 방문 때도 그대로 쓰고 싶으므로 localStorage 에, 입장권(playerId)은 방마다
 * 다르고 탭을 닫으면 의미가 없으므로 sessionStorage 에 둠. 덕분에 같은 브라우저에서 탭을 두 개
 * 열면 서로 다른 참가자로 붙을 수 있어 혼자 테스트하기도 쉬움.
 *
 * 사파리 사생활 보호 모드처럼 저장소 접근 자체가 예외를 던지는 환경이 있어 모든 접근을 감쌈.
 */

const NICKNAME_KEY = 'liar.nickname'
const TICKET_PREFIX = 'liar.ticket.'
const SOUND_KEY = 'liar.sound'

function safeRead(store: Storage, key: string): string | null {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function safeWrite(store: Storage, key: string, value: string): void {
  try {
    store.setItem(key, value)
  } catch {
    // 저장에 실패해도 진행에는 지장이 없으므로 조용히 넘어감
  }
}

function safeRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key)
  } catch {
    // 위와 같음
  }
}

export function loadNickname(): string {
  return safeRead(localStorage, NICKNAME_KEY) ?? ''
}

export function saveNickname(nickname: string): void {
  safeWrite(localStorage, NICKNAME_KEY, nickname)
}

export function loadTicket(roomId: string): JoinTicket | null {
  const raw = safeRead(sessionStorage, TICKET_PREFIX + roomId)
  if (!raw) return null
  try {
    return JSON.parse(raw) as JoinTicket
  } catch {
    return null
  }
}

export function saveTicket(ticket: JoinTicket): void {
  safeWrite(sessionStorage, TICKET_PREFIX + ticket.roomId, JSON.stringify(ticket))
}

export function clearTicket(roomId: string): void {
  safeRemove(sessionStorage, TICKET_PREFIX + roomId)
}

/**
 * 소리를 켤지 여부.
 *
 * 저장된 값이 없으면 켜 둠. 다만 브라우저 정책상 사용자가 화면을 한 번 건드리기 전에는 어차피
 * 아무 소리도 나지 않으므로, 이 기본값이 갑자기 소리를 터뜨리는 일은 없음.
 */
export function loadSoundEnabled(): boolean {
  return safeRead(localStorage, SOUND_KEY) !== 'off'
}

export function saveSoundEnabled(enabled: boolean): void {
  safeWrite(localStorage, SOUND_KEY, enabled ? 'on' : 'off')
}
