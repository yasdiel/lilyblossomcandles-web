export function Candle({ vaso, cera, size = 160, lit = false }) {
  return (
    <svg viewBox="0 0 120 160" width={size} height={size * 1.33} aria-hidden="true">
      {lit && (
        <g className="flame">
          <path d="M60 34 C50 48 52 58 60 62 C68 58 70 48 60 34Z" fill="var(--amber)" opacity=".9" />
          <path d="M60 46 C55 53 56 58 60 60 C64 58 65 53 60 46Z" fill="#F6E3B8" />
        </g>
      )}
      <line x1="60" y1="62" x2="60" y2="74" stroke="var(--cacao)" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="22" y="72" width="76" height="76" rx="6" fill={vaso} />
      <rect x="27" y="76" width="66" height="14" rx="3" fill={cera} />
      <rect x="22" y="72" width="76" height="76" rx="6" fill="none" stroke="rgba(0,0,0,.08)" />
      <rect x="32" y="108" width="56" height="24" rx="2" fill="var(--paper)" opacity=".85" />
      <line x1="40" y1="116" x2="80" y2="116" stroke="var(--cacao)" strokeWidth=".8" opacity=".5" />
      <line x1="46" y1="123" x2="74" y2="123" stroke="var(--cacao)" strokeWidth=".8" opacity=".35" />
    </svg>
  );
}

export default Candle;