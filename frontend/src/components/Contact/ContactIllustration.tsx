/** Inline illustration: a phone showing an order chat, with floating delivery / confirmation badges. */
export default function ContactIllustration() {
  const font = 'Nunito, system-ui, sans-serif'
  return (
    <svg viewBox="0 0 480 340" role="img" aria-label="A phone showing an order chat with a delivery confirmation" className="h-auto w-full max-w-[480px]">
      <defs>
        <linearGradient id="ci-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a65" />
          <stop offset="1" stopColor="#ef5350" />
        </linearGradient>
        <filter id="ci-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#ef5350" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* backdrop blobs */}
      <circle cx="240" cy="175" r="150" className="fill-brand/10" />
      <circle cx="82" cy="70" r="30" className="fill-brand/15" />
      <circle cx="420" cy="285" r="22" className="fill-brand/15" />
      <circle cx="395" cy="55" r="9" fill="#ff8a65" opacity=".6" />
      <circle cx="60" cy="270" r="7" fill="#ef5350" opacity=".5" />

      {/* phone */}
      <g filter="url(#ci-shadow)">
        <rect x="170" y="22" width="150" height="296" rx="26" fill="#1f2023" />
        <rect x="177" y="29" width="136" height="282" rx="20" fill="#fff" />
        <rect x="222" y="34" width="46" height="9" rx="4.5" fill="#1f2023" />
        {/* chat header */}
        <path d="M177 49 a20 20 0 0 1 20-20 h96 a20 20 0 0 1 20 20 v28 h-136z" fill="url(#ci-brand)" />
        <circle cx="198" cy="64" r="11" fill="#fff" />
        <path d="M193 64 l4 4 7-8" fill="none" stroke="#ef5350" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="215" y="62" fontSize="10" fontWeight="800" fill="#fff" fontFamily={font}>Raut Trader's</text>
        <text x="215" y="73" fontSize="7.5" fontWeight="600" fill="#fff" opacity=".85" fontFamily={font}>online · replies fast</text>

        {/* messages */}
        <rect x="186" y="92" width="86" height="30" rx="11" fill="#f3f3f6" />
        <text x="194" y="105" fontSize="8.5" fontWeight="700" fill="#2b2c30" fontFamily={font}>Need 10 boxes of</text>
        <text x="194" y="116" fontSize="8.5" fontWeight="700" fill="#2b2c30" fontFamily={font}>biscuits for my shop</text>

        <rect x="226" y="132" width="78" height="30" rx="11" fill="#dcf8c6" />
        <text x="234" y="145" fontSize="8.5" fontWeight="700" fill="#1f3d1a" fontFamily={font}>In stock! Price</text>
        <text x="234" y="156" fontSize="8.5" fontWeight="700" fill="#1f3d1a" fontFamily={font}>sent to you ✓✓</text>

        <rect x="186" y="172" width="64" height="22" rx="11" fill="#f3f3f6" />
        <text x="196" y="186" fontSize="8.5" fontWeight="700" fill="#2b2c30" fontFamily={font}>Confirm it 👍</text>

        <rect x="214" y="204" width="90" height="42" rx="12" fill="#dcf8c6" />
        <text x="223" y="218" fontSize="8.5" fontWeight="800" fill="#1f3d1a" fontFamily={font}>Order confirmed!</text>
        <text x="223" y="230" fontSize="8" fontWeight="600" fill="#1f3d1a" fontFamily={font}>Delivery tomorrow</text>
        <text x="223" y="240" fontSize="8" fontWeight="600" fill="#1f3d1a" fontFamily={font}>by 11 AM ✓✓</text>

        {/* input bar */}
        <rect x="186" y="270" width="96" height="26" rx="13" fill="#f3f3f6" />
        <text x="198" y="287" fontSize="8.5" fill="#8a919c" fontFamily={font}>Type a message</text>
        <circle cx="297" cy="283" r="13" fill="url(#ci-brand)" />
        <path d="M292 277 l11 6 -11 6 2.5-6z" fill="#fff" />
      </g>

      {/* floating: package */}
      <g transform="translate(58 128)" filter="url(#ci-shadow)">
        <rect width="92" height="74" rx="16" className="fill-white dark:fill-[#3a3b41]" />
        <path d="M24 30 l22-11 22 11 -22 11z" fill="#ff8a65" />
        <path d="M24 30 v22 l22 11 v-22z" fill="#ef5350" />
        <path d="M68 30 v22 l-22 11 v-22z" fill="#e53935" />
        <path d="M35 24.5 l22 11" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* floating: delivery badge */}
      <g transform="translate(326 78)" filter="url(#ci-shadow)">
        <rect width="124" height="52" rx="16" className="fill-white dark:fill-[#3a3b41]" />
        <circle cx="26" cy="26" r="15" fill="url(#ci-brand)" />
        <path d="M18 27 h12 v-8 h-12z M30 22 h5 l3 4 v5 h-8z" fill="#fff" />
        <circle cx="22" cy="32" r="2.4" fill="#ef5350" stroke="#fff" strokeWidth="1" />
        <circle cx="34" cy="32" r="2.4" fill="#ef5350" stroke="#fff" strokeWidth="1" />
        <text x="50" y="23" fontSize="10.5" fontWeight="800" fontFamily={font} className="fill-[#111] dark:fill-white">Fast delivery</text>
        <text x="50" y="37" fontSize="9" fontWeight="600" fontFamily={font} className="fill-[#596579] dark:fill-[#b4b4b8]">To your shop door</text>
      </g>

      {/* floating: rating */}
      <g transform="translate(336 214)" filter="url(#ci-shadow)">
        <rect width="112" height="52" rx="16" className="fill-white dark:fill-[#3a3b41]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} transform={`translate(${14 + i * 17} 11)`} d="M7 0 l2.1 4.7 5.1.5 -3.8 3.4 1.1 5 -4.5-2.6 -4.5 2.6 1.1-5 -3.8-3.4 5.1-.5z" fill="#ffb300" />
        ))}
        <text x="14" y="42" fontSize="9" fontWeight="700" fontFamily={font} className="fill-[#596579] dark:fill-[#b4b4b8]">Trusted by retailers</text>
      </g>

      {/* sparkles */}
      <path d="M118 52 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" fill="#ef5350" opacity=".7" />
      <path d="M370 170 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2z" fill="#ff8a65" />
    </svg>
  )
}
