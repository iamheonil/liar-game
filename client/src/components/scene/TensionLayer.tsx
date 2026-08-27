import type { FlashTone } from '@/hooks/useTension'

interface TensionLayerProps {
  flashKey: number
  flashTone: FlashTone
  dread: boolean
  beatMs: number
}

/**
 * 화면 전체를 덮는 순간 연출.
 *
 * 두 가지만 함. 단계가 바뀔 때 천장 전구가 한 번 크게 번지고, 되돌릴 수 없는 결정에 시간이
 * 얼마 남지 않으면 화면 가장자리가 붉게 맥박침. 맥박 주기는 심장박동 소리와 같은 값을 써서
 * 눈과 귀가 어긋나지 않게 함.
 *
 * 두 겹 모두 fixed 라 스크롤해도 따라오지 않고, pointer-events 를 꺼 두어 아래 버튼을 가리지
 * 않음. z-index 는 결과 오버레이(40)보다 낮게 두어 라운드 결과가 이 위로 올라오게 함.
 *
 * 3분짜리 자유토론을 여러 판 도는 게임이라 연출이 과하면 금방 피로해짐. 그래서 늘 켜져 있는
 * 것은 없고, 전부 짧게 지나가거나 마지막 10초에만 나타남.
 */
export function TensionLayer({ flashKey, flashTone, dread, beatMs }: TensionLayerProps) {
  const flashColor = flashTone === 'blood' ? 'var(--blood-500)' : 'var(--lamp-400)'

  return (
    <>
      {/* key 가 바뀌면 리마운트되어 CSS 애니메이션이 처음부터 다시 돎 */}
      {flashKey > 0 && (
        <div
          key={flashKey}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30"
          style={{
            background: `radial-gradient(120% 70% at 50% -10%, ${flashColor} 0%, transparent 62%)`,
            opacity: 0,
            animation: 'phase-flash 700ms var(--ease-out-expo) forwards',
          }}
        />
      )}

      {dread && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30"
          style={{
            background:
              'radial-gradient(115% 115% at 50% 50%, transparent 42%, var(--blood-600) 100%)',
            // 애니메이션이 꺼진 환경(prefers-reduced-motion)에서 남을 정지 상태
            opacity: 0.18,
            animation: `dread ${beatMs}ms ease-in-out infinite`,
          }}
        />
      )}
    </>
  )
}
