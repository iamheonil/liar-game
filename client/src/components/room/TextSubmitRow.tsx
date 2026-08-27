import { useState, type FormEvent } from 'react'
import { isComposingEnter } from '@/lib/ime'

interface TextSubmitRowProps {
  placeholder: string
  submitLabel: string
  maxLength: number
  disabled?: boolean
  autoFocus?: boolean
  tone?: 'lamp' | 'blood'
  onSubmit: (text: string) => void
}

/** 힌트·채팅·제시어 추측이 모두 "한 줄 입력 후 전송"이라 하나로 묶음. */
export function TextSubmitRow({
  placeholder,
  submitLabel,
  maxLength,
  disabled = false,
  autoFocus = false,
  tone = 'lamp',
  onSubmit,
}: TextSubmitRowProps) {
  const [text, setText] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setText('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        className="field flex-1"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (isComposingEnter(event)) event.preventDefault()
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="send"
        aria-label={placeholder}
      />
      <button
        type="submit"
        className={`btn shrink-0 ${tone === 'blood' ? 'btn-danger' : 'btn-primary'}`}
        disabled={disabled || text.trim().length === 0}
      >
        {submitLabel}
      </button>
    </form>
  )
}
