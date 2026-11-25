/** Soft pastel-teal painted brushstroke, drawn behind the product slider. Decorative only. */
export default function Brushstroke() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 500 320"
      preserveAspectRatio="none"
      className="pointer-events-none absolute left-1/2 top-[130px] z-0 h-[330px] w-[96%] max-w-none -translate-x-1/2 -translate-y-1/2"
    >
      <defs>
        {/* Rough, dry-brush edges */}
        <filter id="brush-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves="4" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="brush-streaks" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves="3" seed="3" result="s" />
          <feDisplacementMap in="SourceGraphic" in2="s" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#brush-edge)">
        <path
          d="M30 70 C 90 28, 190 40, 270 34 C 360 28, 440 40, 470 84 C 492 124, 478 200, 462 246 C 440 290, 330 296, 240 288 C 150 282, 70 292, 38 240 C 14 196, 20 112, 30 70 Z"
          fill="#f7bcbb"
          opacity="0.55"
        />
      </g>
      <g filter="url(#brush-streaks)" opacity="0.35">
        <path d="M44 92 C 160 70, 330 76, 458 100" stroke="#f09a98" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M36 160 C 170 142, 340 150, 470 170" stroke="#fbd3d2" strokeWidth="18" strokeLinecap="round" fill="none" />
        <path d="M48 228 C 180 214, 330 222, 456 238" stroke="#f09a98" strokeWidth="12" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}
