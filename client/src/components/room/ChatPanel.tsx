import { useEffect, useRef } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { ChatView } from '@/types/protocol'

interface ChatListProps {
  messages: ChatView[]
  meId: string
}

interface ChatPanelProps extends ChatListProps {
  className?: string
}

function timeOf(at: number): string {
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * 대화 본문. 스크롤 통을 직접 들고 있음.
 *
 * 새 메시지가 오면 아래로 따라 내려가되, 사용자가 위쪽을 읽고 있는 중이면 방해하지 않음.
 * 토론 중에 지나간 발언을 확인하는 일이 잦아 이 구분이 필요함.
 */
export function ChatList({ messages, meId }: ChatListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedToBottom = useRef(true)

  useEffect(() => {
    const element = scrollRef.current
    if (element && pinnedToBottom.current) {
      element.scrollTop = element.scrollHeight
    }
  }, [messages])

  /*
   * 크기가 달라질 때마다 맨 아래를 다시 붙잡음.
   *
   * 통과 내용을 둘 다 봐야 함. 통이 변하는 경우는 탭을 옮기거나 대기실과 게임 화면을 오가거나
   * 모바일에서 키보드가 올라올 때고, 내용이 변하는 경우는 웹폰트가 뒤늦게 로드되면서 줄바꿈이
   * 다시 계산될 때임. 특히 후자는 새 메시지가 없어 위쪽 효과가 돌지 않으므로, 통만 보고 있으면
   * 첫 화면이 맨 아래가 아닌 어중간한 위치에서 멈춰 버림.
   */
  useEffect(() => {
    const element = scrollRef.current
    const content = element?.firstElementChild
    if (!element || !content || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (pinnedToBottom.current) element.scrollTop = element.scrollHeight
    })
    observer.observe(element)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    pinnedToBottom.current = distanceFromBottom < 48
  }

  return (
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
  )
}

/** 대화 기록. 넓은 화면에서 오른쪽 기둥을 통째로 차지함. */
export function ChatPanel({ className = '', ...list }: ChatPanelProps) {
  return (
    <Panel title="대화" className={className} bodyClassName="min-h-0">
      <ChatList {...list} />
    </Panel>
  )
}
