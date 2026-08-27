import type { GamePhaseName } from '@/types/protocol'

/**
 * 단계별 표시 정보.
 *
 * 진행 판정은 전적으로 서버가 하고 여기 값은 화면 표시에만 쓰임. 특히 duration 은 남은 시간
 * 막대의 길이를 정하는 용도라, 서버 GameRules 와 어긋나도 게임 진행에는 영향이 없고 막대 비율만
 * 어색해짐. 서버 시간 설정을 바꾸면 이 표도 같이 손봐야 함.
 */
export interface PhaseMeta {
  label: string
  /** 지금 무엇을 해야 하는지 한 줄로 알려 주는 안내 */
  hint: string
  durationSeconds: number
  /** 되돌릴 수 없는 결정을 내리는 단계. 조명과 타이머가 붉게 바뀜 */
  tense: boolean
}

export const PHASE_META: Record<GamePhaseName, PhaseMeta> = {
  ROLE_REVEAL: {
    label: '제시어 확인',
    hint: '단어를 외우세요. 곧 힌트 순서가 시작됩니다.',
    durationSeconds: 6,
    tense: false,
  },
  HINT: {
    label: '힌트',
    hint: '차례가 된 사람만 한 마디를 남길 수 있습니다.',
    durationSeconds: 15,
    tense: false,
  },
  DISCUSSION: {
    label: '자유토론',
    hint: '/스킵 을 입력하면 투표를 앞당길 수 있습니다.',
    durationSeconds: 180,
    tense: false,
  },
  VOTE: {
    label: '지목 투표',
    hint: '라이어로 의심되는 사람을 고르세요.',
    durationSeconds: 30,
    tense: true,
  },
  DEFENSE: {
    label: '최후 진술',
    hint: '지목된 사람만 발언할 수 있습니다.',
    durationSeconds: 20,
    tense: true,
  },
  FINAL_VOTE: {
    label: '생사 투표',
    hint: '처형할지 살릴지 결정하세요.',
    durationSeconds: 20,
    tense: true,
  },
  LIAR_GUESS: {
    label: '마지막 반격',
    hint: '처형된 사람이 진짜 제시어를 맞히는 중입니다.',
    durationSeconds: 30,
    tense: true,
  },
  ROUND_RESULT: {
    label: '라운드 결과',
    hint: '',
    durationSeconds: 8,
    tense: false,
  },
  GAME_RESULT: {
    label: '최종 결과',
    hint: '',
    durationSeconds: 0,
    tense: false,
  },
}
