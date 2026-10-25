export function Logo() {
  return (
    <a href="#inicio" className="flex items-center gap-3" aria-label="Lily Blossom Candles - Home">
      <svg viewBox="0 0 24 32" className="h-7 w-5" aria-hidden="true">
        <path d="M12 2 C7 9 8 14 12 16 C16 14 17 9 12 2Z" fill="var(--amber)" />
        <rect x="6" y="18" width="12" height="12" rx="2" fill="none" stroke="var(--cacao)" strokeWidth="1.2" />
      </svg>
      <span className="font-display text-2xl tracking-wide text-[var(--cacao)]">Lily Blossom Candles</span>
    </a>
  );
}

export default Logo;