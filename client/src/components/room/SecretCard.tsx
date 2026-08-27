import type { SecretView } from '@/types/protocol'

interface SecretCardProps {
  secret: SecretView
  /** 역할 공개 단계에서는 크게 강조하고, 그 뒤에는 참고용으로 작게 둠 */
  emphasized: boolean
}

/**
 * 나에게만 보이는 제시어.
 *
 * 라이어에게도 같은 모양으로 (다른) 단어가 나감. 그래서 이 카드를 보는 것만으로는 자신이
 * 라이어인지 알 수 없고, 그 점이 이 게임의 핵심임. 안내 문구도 역할을 암시하지 않게 씀.
 */
export function SecretCard({ secret, emphasized }: SecretCardProps) {
  return (
    <div
      className="panel relative overflow-hidden px-4 py-3 transition-all duration-500"
      style={{
        borderColor: emphasized ? 'var(--lamp-500)' : 'var(--edge)',
        boxShadow: emphasized
          ? '0 0 44px -10px color-mix(in oklab, var(--lamp-500) 70%, transparent)'
          : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{secret.category}</span>
        <span className="text-[0.65rem] text-bone-700">나만 볼 수 있음</span>
      </div>
      <p
        className="font-display mt-1 leading-tight font-bold transition-all duration-500"
        style={{
          color: 'var(--lamp-400)',
          fontSize: emphasized ? 'clamp(2rem, 9vw, 3.25rem)' : 'clamp(1.5rem, 6vw, 2rem)',
        }}
      >
        {secret.word}
      </p>
      {emphasized && (
        <p className="mt-1.5 text-xs text-bone-500">
          이 단어를 직접 말하지 말고, 아는 사람만 알아들을 힌트를 준비하세요.
        </p>
      )}
    </div>
  )
}
