import { useEffect } from 'react'

interface ToastProps {
  id: number
  text: string
  onDismiss: () => void
}

/** 규칙 위반 안내처럼 요청자에게만 잠깐 보여 줄 메시지. */
export function Toast({ id, text, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 3200)
    return () => window.clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div
      role="alert"
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ top: 'calc(var(--safe-top) + 0.75rem)' }}
    >
      <div className="panel-flat max-w-sm px-4 py-2.5 text-sm text-bone-100 shadow-lg"
        style={{ borderColor: 'var(--blood-500)' }}>
        {text}
      </div>
    </div>
  )
}
