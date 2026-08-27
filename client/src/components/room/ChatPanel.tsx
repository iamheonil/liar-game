import { useEffect, useRef } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { ChatView } from '@/types/protocol'

interface ChatPanelProps {
  messages: ChatView[]
  meId: string
  className?: string
}

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * 대화 기록.
 *
 * 새 메시지가 오면 아래로 따라 내려가되, 사용자가 위쪽을 읽고 있는 중이면 방해하지 않음.
 * 토론 중에 지나간 발언을 확인하는 일이 잦아 이 구분이 필요함.
 */
export function ChatPanel({ messages, meId, className = '' }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedToBottom = useRef(true)

  useEffect(() => {
    const element = scrollRef.current
    if (element && pinnedToBottom.current) {
      element.scrollTop = element.scrollHeight
    }
  }, [messages])

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    pinnedToBottom.current = distanceFromBottom < 48
  }

  return (
    <Panel title="대화" className={className} bodyClassName="min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scroll-thin h-full overflow-y-auto px-4 py-3"
      >
        <ul className="flex flex-col gap-2">
          {messages.map((message) => {
            if (message.kind === 'SYSTEM') {
              return (
                <li key={message.id} className="py-0.5 text-center text-xs text-bone-700">
                  {message.text}
                </li>
              )
            }
            const mine = message.authorId === meId
            const isDefense = message.kind === 'DEFENSE'
            return (
              <li
                key={message.id}
                className={isDefense ? 'panel-flat px-3 py-2' : ''}
                style={isDefense ? { borderColor: 'var(--blood-500)' } : undefined}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isDefense
                        ? 'var(--blood-400)'
                        : mine
                          ? 'var(--lamp-400)'
                          : 'var(--bone-500)',
                    }}
                  >
                    {message.authorName}
                    {isDefense && ' — 최후 진술'}
                  </span>
                  <span className="tabular text-[0.6rem] text-bone-700">{timeOf(message.at)}</span>
                </div>
                <p className="text-sm break-words text-bone-100">{message.text}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </Panel>
  )
}
