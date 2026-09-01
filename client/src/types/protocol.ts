/**
 * 서버가 내려보내는 값의 모양.
 *
 * 서버는 null 필드를 아예 빼고 직렬화하므로(non_null), 비어 있을 수 있는 값은 모두 선택 속성임.
 * 라이어 정체와 제시어가 여기 공개 타입에 없다는 점이 중요함. 그 정보는 라운드가 끝난 뒤
 * RoundResultView 로만 나오고, 진행 중에는 개인 채널의 SecretView 로 본인 것만 전달됨.
 */

export type RoomStatus = 'WAITING' | 'PLAYING' | 'RESULT'

export type GamePhaseName =
  | 'ROLE_REVEAL'
  | 'HINT'
  | 'DISCUSSION'
  | 'VOTE'
  | 'DEFENSE'
  | 'FINAL_VOTE'
  | 'LIAR_GUESS'
  | 'ROUND_RESULT'
  | 'GAME_RESULT'

export type WinnerName = 'CITIZEN' | 'LIAR' | 'NONE'

/** 라운드가 어떻게 끝났는지. 승패만으로는 설명되지 않는 경위를 담음 */
export type RoundEnding =
  | 'NO_MAJORITY'
  | 'ACQUITTED'
  | 'WRONG_EXECUTION'
  | 'LIAR_EXECUTED'
  | 'ABORTED'

export type ChatKind = 'CHAT' | 'SYSTEM' | 'DEFENSE'

export interface PlayerView {
  id: string
  nickname: string
  connected: boolean
  host: boolean
  score: number
  abandoned: boolean
}

export interface HintView {
  order: number
  playerId: string
  text: string
  passed: boolean
}

export interface RoundResultView {
  round: number
  category: string
  citizenWord: string
  liarWord: string
  liarId: string
  accusedId?: string
  liarCaught: boolean
  liarGuess?: string
  liarGuessCorrect: boolean
  ending: RoundEnding
  winner: WinnerName
  awardedPoints: Record<string, number>
}

export interface RankView {
  rank: number
  playerId: string
  nickname: string
  score: number
}

export interface GameResultView {
  ranking: RankView[]
  rounds: RoundResultView[]
}

export interface GameView {
  phase: GamePhaseName
  round: number
  totalRounds: number
  /** 현재 단계가 끝나는 시각(epoch ms). 결과 화면처럼 제한이 없으면 비어 있음 */
  phaseEndsAt?: number
  turnOrder: string[]
  turnPlayerId?: string
  hints: HintView[]
  votes: Record<string, string>
  finalVotes: Record<string, boolean>
  accusedId?: string
  skipVotes: string[]
  skipThreshold: number
  lastRound?: RoundResultView
  finalResult?: GameResultView
}

export interface RoomView {
  roomId: string
  title: string
  status: RoomStatus
  hostId: string
  totalRounds: number
  allowedRounds: number[]
  minPlayers: number
  maxPlayers: number
  players: PlayerView[]
  game?: GameView
  /** 스냅샷을 만든 서버 시각. 브라우저 시계 오차 보정에 씀 */
  serverTime: number
}

export interface RoomSummaryView {
  roomId: string
  title: string
  hostNickname: string
  playerCount: number
  maxPlayers: number
  status: RoomStatus
  totalRounds: number
  joinable: boolean
}

export interface SecretView {
  round: number
  category: string
  word: string
  turnOrder: string[]
}

export interface ChatView {
  id: string
  kind: ChatKind
  authorId?: string
  authorName?: string
  text: string
  at: number
}

export interface JoinTicket {
  roomId: string
  title: string
  playerId: string
  nickname: string
}

export type ServerMessage =
  | { type: 'ROOM_STATE'; payload: RoomView }
  | { type: 'CHAT'; payload: ChatView }
  | { type: 'CHAT_HISTORY'; payload: ChatView[] }
  | { type: 'SECRET'; payload: SecretView }
  | { type: 'ROOM_LIST'; payload: RoomSummaryView[] }
  | { type: 'ERROR'; payload: { reason: string } }
  | { type: 'CLOSED'; payload: { reason: string } }
