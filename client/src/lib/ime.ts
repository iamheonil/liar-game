import type { KeyboardEvent } from 'react'

/**
 * 한글 입력 중에 눌린 엔터인지 판별함.
 *
 * 한글은 조합 중인 글자가 있는 상태에서 엔터를 누르면 그 엔터가 "조합 확정" 용도로 먼저 쓰임.
 * 이때 폼 제출까지 함께 일어나면 마지막 글자가 빠진 채 전송되거나 같은 내용이 두 번 나감.
 * 그래서 조합 중 엔터는 제출로 보지 않고, 확정된 뒤 다시 누른 엔터만 제출로 처리함.
 */
export function isComposingEnter(event: KeyboardEvent<HTMLInputElement>): boolean {
  return event.key === 'Enter' && (event.nativeEvent as globalThis.KeyboardEvent).isComposing
}
