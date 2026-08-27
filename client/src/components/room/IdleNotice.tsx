interface IdleNoticeProps {
  text: string
  tone?: 'quiet' | 'tense'
}

/** 지금은 입력할 것이 없다는 사실 자체를 알려 주는 자리. 입력창이 사라져 당황하지 않도록 함. */
export function IdleNotice({ text, tone = 'quiet' }: IdleNoticeProps) {
  return (
    <p
      className="panel-flat px-4 py-3 text-center text-sm"
      style={{
        color: tone === 'tense' ? 'var(--blood-400)' : 'var(--bone-500)',
        borderColor: tone === 'tense' ? 'var(--blood-600)' : 'var(--edge)',
      }}
    >
      {text}
    </p>
  )
}
