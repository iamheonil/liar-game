import { IdleNotice } from './IdleNotice'
import { TextSubmitRow } from './TextSubmitRow'
import type { RoomView } from '@/types/protocol'

interface ActionBarProps {
  room: RoomView
  meId: string
  onSend: (action: string, body?: unknown) => void
}

/** 서버 검증 값과 맞춰 둔 입력 길이 상한. 넘겨 봐야 거절당하므로 미리 막음 */
const MAX_HINT = 30
const MAX_GUESS = 30
const MAX_CHAT = 200

/**
 * 지금 할 수 있는 단 하나의 행동만 보여 주는 하단 바.
 *
 * 라이어 게임은 단계마다 허용되는 행동이 완전히 달라서, 모든 입력을 늘어놓으면 무엇을 눌러야
 * 하는지 헷갈림. 그래서 단계별로 필요한 입력 하나만 남기고 나머지는 아예 그리지 않음.
 */
export function ActionBar({ room, meId, onSend }: ActionBarProps) {
  const game = room.game
  const me = room.players.find((player) => player.id === meId)

  const chatRow = (placeholder = '메시지를 입력하세요') => (
    <TextSubmitRow
      placeholder={placeholder}
      submitLabel="전송"
      maxLength={MAX_CHAT}
      onSubmit={(text) => onSend('chat', { text })}
    />
  )

  if (me?.abandoned) {
    return <IdleNotice text="연결이 끊겨 이번 게임에서 빠졌습니다. 다음 게임부터 참여할 수 있습니다." tone="tense" />
  }

  if (!game) {
    return chatRow()
  }

  const iAmAccused = game.accusedId === meId
  const alreadySkipped = game.skipVotes.includes(meId)

  switch (game.phase) {
    case 'ROLE_REVEAL':
      return <IdleNotice text="제시어를 확인하세요. 곧 순서가 시작됩니다." />

    case 'HINT':
      return game.turnPlayerId === meId ? (
        <TextSubmitRow
          placeholder="힌트를 한 마디로"
          submitLabel="제출"
          maxLength={MAX_HINT}
          autoFocus
          onSubmit={(text) => onSend('hint', { text })}
        />
      ) : (
        <IdleNotice text="다른 사람의 차례입니다. 지금은 아무도 채팅할 수 없습니다." />
      )

    case 'DISCUSSION':
      return (
        <div className="flex flex-col gap-2">
          {chatRow('의심되는 점을 말해 보세요')}
          <button
            type="button"
            className="btn w-full"
            disabled={alreadySkipped}
            onClick={() => onSend('chat', { text: '/스킵' })}
          >
            {alreadySkipped
              ? `투표 앞당기기 동의함 (${game.skipVotes.length}/${game.skipThreshold})`
              : `투표 앞당기기 (${game.skipVotes.length}/${game.skipThreshold})`}
          </button>
        </div>
      )

    case 'VOTE': {
      const myVote = game.votes[meId]
      const votedName = room.players.find((player) => player.id === myVote)?.nickname
      return (
        <div className="flex flex-col gap-2">
          <IdleNotice
            text={
              votedName
                ? `${votedName} 님을 지목했습니다. 시간 안에는 바꿀 수 있습니다.`
                : '위 참가자 목록에서 라이어로 의심되는 사람을 누르세요.'
            }
            tone="tense"
          />
          {chatRow()}
        </div>
      )
    }

    case 'DEFENSE':
      return iAmAccused ? (
        <TextSubmitRow
          placeholder="마지막으로 하고 싶은 말"
          submitLabel="발언"
          maxLength={MAX_CHAT}
          tone="blood"
          autoFocus
          onSubmit={(text) => onSend('chat', { text })}
        />
      ) : (
        <IdleNotice text="지목된 사람의 최후 진술을 듣는 중입니다." tone="tense" />
      )

    case 'FINAL_VOTE': {
      if (iAmAccused) {
        return <IdleNotice text="당신의 생사가 결정되는 중입니다." tone="tense" />
      }
      const myChoice = game.finalVotes[meId]
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              className={`btn flex-1 ${myChoice === true ? 'btn-danger' : ''}`}
              onClick={() => onSend('final-vote', { approve: true })}
            >
              처형
            </button>
            <button
              type="button"
              className={`btn flex-1 ${myChoice === false ? 'btn-primary' : ''}`}
              onClick={() => onSend('final-vote', { approve: false })}
            >
              생존
            </button>
          </div>
          {chatRow()}
        </div>
      )
    }

    case 'LIAR_GUESS':
      return iAmAccused ? (
        <TextSubmitRow
          placeholder="진짜 제시어는 무엇이었을까"
          submitLabel="맞히기"
          maxLength={MAX_GUESS}
          tone="blood"
          autoFocus
          onSubmit={(word) => onSend('guess', { word })}
        />
      ) : (
        <IdleNotice text="처형된 사람이 제시어를 맞히는 중입니다." tone="tense" />
      )

    case 'ROUND_RESULT':
    case 'GAME_RESULT':
      return chatRow()
  }
}
