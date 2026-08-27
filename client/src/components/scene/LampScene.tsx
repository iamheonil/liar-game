interface LampSceneProps {
  className?: string
  /** 투표·처형처럼 긴장이 높은 단계에서 조명을 붉게 물들임 */
  tense?: boolean
}

/**
 * 방 한가운데 장면.
 *
 * 천장에 매달린 전구 하나가 낡은 책상을 비추고, 그 위에 리볼버가 놓여 있음. 이 게임에서 결정이
 * 내려지는 자리를 시각적으로 고정해 두는 역할이라, 참가자들은 이 책상을 둘러싸고 앉음.
 *
 * 순수 SVG 로 그려 외부 이미지 요청이 없고 어떤 화면 크기에서도 선명함.
 */
export function LampScene({ className = '', tense = false }: LampSceneProps) {
  const beam = tense ? '#d24b4b' : '#edc06a'

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      aria-label="전구 아래 책상 위에 놓인 리볼버"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="bulbGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor={beam} stopOpacity="0.95" />
          <stop offset="35%" stopColor={beam} stopOpacity="0.35" />
          <stop offset="100%" stopColor={beam} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beamFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={beam} stopOpacity="0.22" />
          <stop offset="70%" stopColor={beam} stopOpacity="0.05" />
          <stop offset="100%" stopColor={beam} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="tablePool" cx="50%" cy="42%">
          <stop offset="0%" stopColor={beam} stopOpacity="0.30" />
          <stop offset="100%" stopColor={beam} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tableTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2b1d" />
          <stop offset="100%" stopColor="#1a120c" />
        </linearGradient>
      </defs>

      {/* 전선과 소켓 */}
      <line x1="200" y1="0" x2="200" y2="58" stroke="#241d16" strokeWidth="2.5" />
      <rect x="193" y="52" width="14" height="14" rx="2" fill="#2b231a" />

      {/* 빛기둥 — 아래로 갈수록 흩어짐 */}
      <path d="M200 76 L318 238 L82 238 Z" fill="url(#beamFade)" />

      {/* 전구 */}
      <circle cx="200" cy="120" r="86" fill="url(#bulbGlow)" />
      <path
        d="M200 66 c11 0 19 8 19 18 c0 7 -4 11 -6 15 c-2 3 -3 5 -3 8 h-20 c0 -3 -1 -5 -3 -8 c-2 -4 -6 -8 -6 -15 c0 -10 8 -18 19 -18 z"
        fill={beam}
        fillOpacity="0.92"
      />
      <rect x="192" y="106" width="16" height="6" rx="1.5" fill="#4a3a24" />

      {/* 책상 */}
      <ellipse cx="200" cy="242" rx="150" ry="34" fill="url(#tableTop)" />
      <ellipse cx="200" cy="242" rx="150" ry="34" fill="url(#tablePool)" />
      <ellipse
        cx="200"
        cy="242"
        rx="150"
        ry="34"
        fill="none"
        stroke={beam}
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      <path d="M60 248 q140 44 280 0 l0 12 q-140 42 -280 0 z" fill="#150e09" />

      {/* 리볼버 — 빛을 받아 윗면만 희미하게 드러남 */}
      <g transform="translate(148 218) rotate(-4)">
        <g fill="#080605">
          <rect x="0" y="6" width="58" height="9" rx="2.5" />
          <rect x="50" y="1" width="32" height="14" rx="3" />
          <circle cx="68" cy="15" r="10.5" />
          <path d="M78 7 L93 7 L100 33 L87 37 Z" />
          <path d="M62 25 q6 8 15 8 l-2 5 q-13 0 -19 -10 z" />
        </g>
        <g fill="none" stroke={beam} strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round">
          <line x1="2" y1="6.5" x2="56" y2="6.5" />
          <line x1="52" y1="1.5" x2="80" y2="1.5" />
          <path d="M79 7.5 L92 7.5" />
        </g>
        <circle cx="68" cy="15" r="3.4" fill="#1c1510" />
      </g>
    </svg>
  )
}
