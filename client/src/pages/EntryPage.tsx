import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LampScene } from '@/components/scene/LampScene'
import { isComposingEnter } from '@/lib/ime'
import { loadNickname, saveNickname } from '@/lib/storage'

const MAX_NICKNAME = 12

/**
 * 첫 화면.
 *
 * 여기서 받는 것은 닉네임 하나뿐임. 계정도 비밀번호도 없어야 친구들이 링크를 받자마자 바로
 * 들어올 수 있음. 대신 한 번 입력한 닉네임은 브라우저에 남겨 두어 다음부터는 그냥 통과함.
 */
export function EntryPage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(loadNickname)
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = nickname.trim()
    if (trimmed.length === 0) {
      setError('이름을 입력하세요')
      return
    }
    saveNickname(trimmed)
    navigate('/lobby')
  }

  return (
    <main className="screen atmosphere flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <LampScene className="mx-auto mb-2 h-44 w-full" />

        <div className="text-center">
          <h1
            className="font-display text-6xl leading-none font-bold tracking-[0.18em]"
            style={{ color: 'var(--lamp-400)' }}
          >
            LIAR
          </h1>
          <p className="mt-3 text-sm text-bone-500">
            한 명은 정답을 모른다.
            <br />
            그런데 그 한 명도 자기가 누구인지 모른다.
          </p>
        </div>

        <form onSubmit={submit} className="mt-9 flex flex-col gap-3">
          <label className="eyebrow" htmlFor="nickname">
            이름
          </label>
          <input
            id="nickname"
            className="field"
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value)
              setError('')
            }}
            placeholder="테이블에 앉을 이름"
            maxLength={MAX_NICKNAME}
            onKeyDown={(event) => {
              if (isComposingEnter(event)) event.preventDefault()
            }}
            autoComplete="nickname"
            enterKeyHint="go"
          />
          {error && (
            <p className="text-xs" style={{ color: 'var(--blood-400)' }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary mt-1 w-full">
            들어가기
          </button>
        </form>
      </div>
    </main>
  )
}
