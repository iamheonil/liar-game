import type { RoomView } from '@/types/protocol'

/**
 * 지금 이 사람이 무언가를 해야 하는지, 해야 한다면 무엇인지.
 *
 * 처음 해 보는 사람이 가장 자주 막히는 지점이 "지금 내가 뭘 해야 하지?" 임. 단계마다 규칙이
 * 다른 데다, 어떤 단계는 나만 행동하고 어떤 단계는 전원이 행동하기 때문임. 그 판단을 화면 여러
 * 곳에 흩어 두면 하단 바는 밝은데 안내 문구는 안 뜨는 식으로 금방 어긋나므로 한곳에 모음.
 *
 * 이미 할 일을 마친 경우(투표를 던졌다든가)에는 null 을 돌려줘서 강조가 꺼지게 함. 계속 재촉당하는
 * 느낌을 주지 않기 위함임.
 */
export interface PendingAction {
  /** 크게 보여 줄 한 줄 */
  title: string
  /** 무엇을 어떻게 하면 되는지 알려 주는 부연 */
  detail: string
}

export function pendingActionOf(room: RoomView, meId: string): PendingAction | null {
  const game = room.game
  if (!game) {
    return null
  }
  const me = room.players.find((player) => player.id === meId)
  if (!me || me.abandoned) {
    return null
  }

  const iAmAccused = game.accusedId === meId

  switch (game.phase) {
    case 'HINT':
      return game.turnPlayerId === meId
        ? {
            title: '당신 차례입니다',
            detail: '제시어를 아는 사람만 알아들을 힌트를 한 마디로 입력하세요.',
          }
        : null

    case 'VOTE':
      return game.votes[meId]
        ? null
        : {
            title: '지목할 차례입니다',
            detail: '위 참가자 목록에서 라이어로 의심되는 사람을 누르세요.',
          }

    case 'DEFENSE':
      return iAmAccused
        ? {
            title: '최후 진술',
            detail: '지금은 당신만 말할 수 있습니다. 살아남을 이유를 대세요.',
          }
        : null

    case 'FINAL_VOTE':
      if (iAmAccused || game.finalVotes[meId] !== undefined) {
        return null
      }
      return {
        title: '생사를 결정하세요',
        detail: '지목된 사람을 처형할지 살릴지 아래에서 고르세요.',
      }

    case 'LIAR_GUESS':
      return iAmAccused
        ? {
            title: '마지막 기회',
            detail: '진짜 제시어를 맞히면 그대로 역전승입니다.',
          }
        : null

    default:
      return null
  }
}
