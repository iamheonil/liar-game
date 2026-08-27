import { Panel } from '@/components/ui/Panel'
import type { RoomView } from '@/types/protocol'

interface WaitingControlsProps {
  room: RoomView
  meId: string
  onSend: (action: string, body?: unknown) => void
}

/**
 * 대기실 조작부.
 *
 * 라운드 수는 게임이 돌지 않는 동안이면 언제든 바꿀 수 있고, 시작은 방장만 누를 수 있음.
 * 방장이 아닌 사람에게도 현재 설정을 그대로 보여 줘서 무엇이 정해졌는지 알 수 있게 함.
 */
export function WaitingControls({ room, meId, onSend }: WaitingControlsProps) {
  const isHost = room.hostId === meId
  const readyCount = room.players.filter((player) => player.connected).length
  const canStart = readyCount >= room.minPlayers

  return (
    <Panel title="대기실" bodyClassName="px-4 py-4">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs text-bone-700">라운드 수</p>
          <div className="flex gap-2">
            {room.allowedRounds.map((rounds) => {
              const selected = room.totalRounds === rounds
              return (
                <button
                  key={rounds}
                  type="button"
                  className={`btn flex-1 ${selected ? 'btn-primary' : ''}`}
                  disabled={!isHost}
                  onClick={() => onSend('settings', { totalRounds: rounds })}
                  aria-pressed={selected}
                >
                  {rounds}
                </button>
              )
            })}
          </div>
          {!isHost && (
            <p className="mt-1.5 text-[0.7rem] text-bone-700">방장만 바꿀 수 있습니다.</p>
          )}
        </div>

        <div className="rule" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="tabular text-sm text-bone-300">
              {readyCount} / {room.maxPlayers} 명 접속
            </p>
            <p className="text-[0.7rem] text-bone-700">
              최소 {room.minPlayers}명부터 시작할 수 있습니다.
            </p>
          </div>
          {isHost ? (
            <button
              type="button"
              className="btn btn-primary shrink-0"
              disabled={!canStart}
              onClick={() => onSend('start')}
            >
              게임 시작
            </button>
          ) : (
            <span className="shrink-0 text-xs text-bone-700">방장의 시작을 기다리는 중</span>
          )}
        </div>
      </div>
    </Panel>
  )
}
