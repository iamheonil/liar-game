import type { ReactNode } from 'react'

interface PanelProps {
  title?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** 이 게임의 기본 표면. 제목이 있으면 위쪽에 얇은 구분선과 함께 얹음. */
export function Panel({ title, aside, children, className = '', bodyClassName = '' }: PanelProps) {
  return (
    <section className={`panel flex flex-col overflow-hidden ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <h2 className="eyebrow">{title}</h2>
          {aside}
        </header>
      )}
      {title && <div className="rule mx-4" />}
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
