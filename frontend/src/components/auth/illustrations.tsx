/** Flat illustrations for the sign-in / sign-up pages. White + soft pink shapes meant for the red gradient panel. */

export function ShopIllustration() {
  return (
    <svg viewBox="0 0 520 400" role="img" aria-label="A shop with a delivery truck bringing an order" className="h-auto w-full max-w-[480px]">
      <ellipse cx="260" cy="352" rx="235" ry="16" fill="#000" opacity=".12" />
      {/* shop */}
      <rect x="52" y="150" width="226" height="196" rx="10" fill="#fff" />
      <rect x="52" y="150" width="226" height="22" rx="4" fill="#ffd9d6" />
      <path d="M40 152 L66 98 H264 L290 152 Z" fill="#fff" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${40 + i * 41.7} 152 q20.8 26 41.7 0 L${40 + i * 41.7 + 41.7} 98 H${40 + i * 41.7} Z`} fill={i % 2 ? '#ffe3e1' : '#ef5350'} opacity={i % 2 ? 1 : 0.95} />
      ))}
      <path d="M40 152 q20.8 26 41.7 0 q20.8 26 41.7 0 q20.8 26 41.7 0 q20.8 26 41.7 0 q20.8 26 41.7 0 q20.8 26 41.7 0" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="112" y="68" width="106" height="30" rx="15" fill="#fff" />
      <text x="165" y="89" textAnchor="middle" fontSize="15" fontWeight="800" fill="#e53935" fontFamily="Nunito, sans-serif">YOUR SHOP</text>
      {/* window with shelves */}
      <rect x="74" y="190" width="104" height="96" rx="8" fill="#fff4f4" stroke="#ffc9c6" strokeWidth="3" />
      <path d="M74 236 H178 M74 262 H178" stroke="#ffc9c6" strokeWidth="3" />
      {[[84, 214, '#ef5350'], [106, 208, '#ffb74d'], [128, 214, '#66bb6a'], [150, 210, '#42a5f5']].map(([x, y, c]) => (
        <rect key={String(x)} x={Number(x)} y={Number(y)} width="16" height={236 - Number(y)} rx="3" fill={String(c)} />
      ))}
      {[[84, 242, '#ffb74d'], [110, 242, '#ef5350'], [136, 242, '#42a5f5']].map(([x, y, c]) => (
        <rect key={String(x)} x={Number(x)} y={Number(y)} width="20" height="20" rx="3" fill={String(c)} />
      ))}
      {/* door */}
      <rect x="196" y="196" width="60" height="150" rx="6" fill="#ef5350" />
      <rect x="204" y="206" width="44" height="60" rx="4" fill="#ff8a80" opacity=".55" />
      <circle cx="241" cy="282" r="3.5" fill="#fff" />
      {/* truck */}
      <g>
        <rect x="300" y="226" width="126" height="86" rx="10" fill="#fff" />
        <path d="M426 252 h36 l30 36 v24 h-66 z" fill="#ffe3e1" />
        <path d="M440 260 h16 l17 22 h-33 z" fill="#ef5350" opacity=".7" />
        <circle cx="362" cy="269" r="22" fill="#ef5350" />
        <path d="M352 269 l7 7 13-15" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="338" cy="318" r="18" fill="#2b2c30" /><circle cx="338" cy="318" r="7" fill="#d8d8df" />
        <circle cx="456" cy="318" r="18" fill="#2b2c30" /><circle cx="456" cy="318" r="7" fill="#d8d8df" />
        <path d="M268 330 h24" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" opacity=".7" />
      </g>
      {/* floating cards */}
      <g>
        <rect x="318" y="64" width="150" height="44" rx="14" fill="#fff" />
        <circle cx="342" cy="86" r="12" fill="#ef5350" />
        <path d="M336 86 l5 5 9-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="362" y="83" fontSize="11.5" fontWeight="800" fill="#2b2c30" fontFamily="Nunito, sans-serif">Order placed</text>
        <text x="362" y="97" fontSize="9.5" fontWeight="600" fill="#8a919c" fontFamily="Nunito, sans-serif">Delivery tomorrow</text>
        <rect x="372" y="128" width="104" height="36" rx="12" fill="#fff" opacity=".95" />
        {[0, 1, 2, 3, 4].map((i) => <path key={i} transform={`translate(${384 + i * 17} 138)`} d="M7 0 l2 4.5 4.9.5 -3.6 3.3 1 4.8 -4.3-2.5 -4.3 2.5 1-4.8 -3.6-3.3 4.9-.5z" fill="#ffb300" />)}
      </g>
      <circle cx="44" cy="84" r="9" fill="#fff" opacity=".35" /><circle cx="500" cy="212" r="6" fill="#fff" opacity=".4" />
      <path d="M240 36 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" fill="#fff" opacity=".8" />
    </svg>
  )
}

export function AdminIllustration() {
  return (
    <svg viewBox="0 0 520 400" role="img" aria-label="A shop dashboard with charts and a secure lock" className="h-auto w-full max-w-[480px]">
      <ellipse cx="260" cy="366" rx="225" ry="14" fill="#000" opacity=".12" />
      {/* window */}
      <rect x="40" y="46" width="400" height="290" rx="18" fill="#fff" />
      <path d="M40 64 a18 18 0 0 1 18-18 h364 a18 18 0 0 1 18 18 v22 H40z" fill="#ffe3e1" />
      <circle cx="62" cy="66" r="5" fill="#ef5350" /><circle cx="80" cy="66" r="5" fill="#ffb74d" /><circle cx="98" cy="66" r="5" fill="#66bb6a" />
      {/* sidebar */}
      <rect x="54" y="98" width="74" height="224" rx="10" fill="#fff4f4" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="64" y={112 + i * 38} width="54" height="26" rx="8" fill={i === 0 ? '#ef5350' : '#ffd9d6'} />)}
      {/* stat cards */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={142 + i * 98} y="98" width="90" height="56" rx="12" fill="#fff4f4" />
          <rect x={152 + i * 98} y="110" width="38" height="7" rx="3.5" fill="#ffc9c6" />
          <rect x={152 + i * 98} y="126" width="58" height="14" rx="5" fill="#ef5350" opacity={1 - i * 0.18} />
        </g>
      ))}
      {/* bar chart */}
      <rect x="142" y="168" width="178" height="154" rx="12" fill="#fff4f4" />
      {[34, 64, 48, 88, 70, 104, 120].map((h, i) => <rect key={i} x={156 + i * 23} y={308 - h} width="13" height={h} rx="6.5" fill={i === 6 ? '#e53935' : '#f7a09d'} />)}
      {/* donut */}
      <rect x="332" y="168" width="94" height="154" rx="12" fill="#fff4f4" />
      <circle cx="379" cy="226" r="26" fill="none" stroke="#ffd9d6" strokeWidth="14" />
      <circle cx="379" cy="226" r="26" fill="none" stroke="#ef5350" strokeWidth="14" strokeDasharray="96 163" transform="rotate(-90 379 226)" />
      <circle cx="379" cy="226" r="26" fill="none" stroke="#ffb74d" strokeWidth="14" strokeDasharray="34 163" strokeDashoffset="-98" transform="rotate(-90 379 226)" />
      {[0, 1, 2].map((i) => <rect key={i} x="346" y={272 + i * 14} width={52 - i * 10} height="6" rx="3" fill="#ffc9c6" />)}
      {/* order toast */}
      <g>
        <rect x="318" y="30" width="170" height="46" rx="14" fill="#fff" />
        <circle cx="344" cy="53" r="13" fill="#ef5350" />
        <path d="M337 53 h14 M337 48 h14 M337 58 h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <text x="365" y="50" fontSize="11.5" fontWeight="800" fill="#2b2c30" fontFamily="Nunito, sans-serif">New order</text>
        <text x="365" y="64" fontSize="9.5" fontWeight="600" fill="#8a919c" fontFamily="Nunito, sans-serif">RT-1042 · ₹2,157</text>
      </g>
      {/* lock badge */}
      <g>
        <circle cx="440" cy="300" r="46" fill="#ffe3e1" />
        <circle cx="440" cy="300" r="36" fill="#ef5350" />
        <rect x="425" y="297" width="30" height="24" rx="6" fill="#fff" />
        <path d="M430 297 v-6 a10 10 0 0 1 20 0 v6" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="440" cy="308" r="3.6" fill="#ef5350" /><rect x="438.6" y="308" width="2.8" height="7" rx="1.4" fill="#ef5350" />
      </g>
      <circle cx="30" cy="150" r="8" fill="#fff" opacity=".35" /><path d="M492 140 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" fill="#fff" opacity=".8" />
    </svg>
  )
}
