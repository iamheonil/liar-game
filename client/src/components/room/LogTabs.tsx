import { useEffect, useRef, useState } from 'react'
import { ChatList } from './ChatPanel'
import { HintList, pendingHintCount } from './HintBoard'
import type { ChatView, GamePhaseName, HintView, PlayerView } from '@/types/protocol'

interface LogTabsProps {
  hints: HintView[]
  players: PlayerView[]
  turnPlayerId?: string
  meId: string
  messages: ChatView[]
  /** 대기실에서는 힌트가 없으므로 탭 없이 대화만 보여 줌 */
  phase?: GamePhaseName
  className?: string
}

type Tab = 'hint' | 'chat'

/**
 * 좁은 화면에서 힌트와 대화가 한 자리를 나눠 씀.
 *
 * 둘 다 "쌓이는 기록"이라 세로로 이어 붙이면 각자 반쪽짜리 높이만 갖게 되고, 화면은 화면대로
 * 넘침. 겹쳐 두고 탭으로 고르면 남는 높이를 통째로 한쪽에 줄 수 있음.
 *
 * 다만 탭은 안 보이는 쪽을 잊게 만드는 것이 문제라 두 가지를 덧붙임. 하나는 단계가 바뀔 때
 * 그 단계에서 봐야 할 쪽으로 알아서 넘어가는 것(힌트 순서에는 힌트, 토론이 열리면 대화),
 * 다른 하나는 힌트를 보는 동안 쌓인 대화 수를 탭에 표시하는 것.
 *
 * 자동 전환은 단계가 바뀌는 순간에만 일어남. 그 뒤에 사용자가 직접 고른 탭은 다음 단계가 올
 * 때까지 그대로 둠 — 보고 있던 것을 빼앗지 않기 위함.
 */
export function LogTabs({
  hints,
  players,
  turnPlayerId,
  meId,
  messages,
  phase,
  className = '',
}: LogTabsProps) {
  const [tab, setTab] = useState<Tab>('hint')
  const [unread, setUnread] = useState(0)
  const prevPhase = useRef<GamePhaseName | undefined>(undefined)
  const seenCount = useRef(messages.length)

  // 단계가 바뀌는 순간에만 자동으로 넘어감
  useEffect(() => {
    if (prevPhase.current === phase) return
    prevPhase.current = phase
    if (phase === 'ROLE_REVEAL' || phase === 'HINT') setTab('hint')
    else if (phase === 'DISCUSSION') setTab('chat')
  }, [phase])

  useEffect(() => {
    if (tab === 'chat') {
      seenCount.current = messages.length
      setUnread(0)
      return
    }
    setUnread(Math.max(0, messages.length - seenCount.current))
  }, [messages, tab])

  const showHints = phase !== undefined
  const active = showHints ? tab : 'chat'
  const pending = pendingHintCount(hints, players)

  // 붉은 배지는 '읽지 않은 것이 있다'는 뜻으로만 씀. 힌트 진행 수까지 붉게 하면
  // 아무 일도 없는데 경고가 켜져 있는 것처럼 보임
  const tabButton = (value: Tab, label: string, badge?: string, alert = false) => {
    const on = active === value
    const loud = alert && !on
    return (
      <button
        type="button"
        role="tab"
        aria-selected={on}
        onClick={() => setTab(value)}
        className="eyebrow flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors"
        style={{
          color: on ? 'var(--lamp-400)' : 'var(--bone-700)',
          borderBottom: `2px solid ${on ? 'var(--lamp-500)' : 'transparent'}`,
        }}
      >
        {label}
        {badge && (
          <span
            className="tabular rounded-full px-1.5 py-px text-[0.6rem] tracking-normal"
            style={{
              background: loud ? 'var(--blood-600)' : 'transparent',
              color: loud ? 'var(--bone-100)' : 'var(--bone-700)',
            }}
          >
            {badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <section className={`panel flex flex-col overflow-hidden ${className}`}>
      {showHints ? (
        <div className="flex shrink-0 border-b border-[var(--edge)] px-2" role="tablist">
          {tabButton('hint', '힌트', `${hints.length}/${hints.length + pending}`)}
          {tabButton('chat', '대화', unread > 0 ? `+${unread}` : undefined, true)}
        </div>
      ) : (
        <div className="shrink-0 px-4 pt-3 pb-2">
          <h2 className="eyebrow">대화</h2>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {active === 'hint' ? (
          <div className="scroll-thin h-full overflow-y-auto px-4 py-3">
            <HintList hints={hints} players={players} turnPlayerId={turnPlayerId} meId={meId} />
          </div>
        ) : (
          <ChatList messages={messages} meId={meId} />
        )}
      </div>
    </section>
  )
}
