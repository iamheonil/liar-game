import type { GamePhaseName } from '@/types/protocol'

/**
 * 단계별 표시 정보.
 *
 * 진행 판정은 전적으로 서버가 하고 여기 값은 화면 표시에만 쓰임. 특히 duration 은 남은 시간
 * 막대의 길이를 정하는 용도라, 서버 GameRules 와 어긋나도 게임 진행에는 영향이 없고 막대 비율만
 * 어색해짐. 서버 시간 설정을 바꾸면 이 표도 같이 손봐야 함.
 *
 * 단계별 안내 문구는 여기 두지 않음. 무엇을 해야 하는지는 하단 입력 바가 이미 말하고 있어서,
 * 양쪽에 두면 같은 문장을 두 번 쓰게 되고 좁은 화면에서 그만큼 자리를 뺏김.
 */
export interface PhaseMeta {
  label: string
  durationSeconds: number
  /** 되돌릴 수 없는 결정을 내리는 단계. 조명과 타이머가 붉게 바뀜 */
  tense: boolean
}

export const PHASE_META: Record<GamePhaseName, PhaseMeta> = {
  ROLE_REVEAL: {
    label: '제시어 확인',
    durationSeconds: 6,
    tense: false,
  },
  HINT: {
    label: '힌트',
    durationSeconds: 15,
    tense: false,
  },
  DISCUSSION: {
    label: '자유토론',
    durationSeconds: 180,
    tense: false,
  },
  VOTE: {
    label: '지목 투표',
    durationSeconds: 30,
    tense: true,
  },
  DEFENSE: {
    label: '최후 진술',
    durationSeconds: 20,
    tense: true,
  },
  FINAL_VOTE: {
    label: '생사 투표',
    durationSeconds: 20,
    tense: true,
  },
  LIAR_GUESS: {
    label: '마지막 반격',
    durationSeconds: 30,
    tense: true,
  },
  ROUND_RESULT: {
    label: '라운드 결과',
    durationSeconds: 8,
    tense: false,
  },
  GAME_RESULT: {
    label: '최종 결과',
    durationSeconds: 0,
    tense: false,
  },
}
