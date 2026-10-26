import Logo from "./Logo";

export function Header({ count, onCartClick }) {
  const links = [["Home", "#inicio"], ["Collection", "#coleccion"], ["Custom orders", "#custom-orders"], ["About", "#nosotros"], ["Ingredients", "#ingredients"], ["Contact", "#contacto"]];
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--ash)] bg-[var(--bone)]/90 backdrop-blur">
      <div className="mx-auto flex w-full items-center justify-between px-6 py-3">
        <Logo />
        <nav className="font-body hidden gap-4 text-[13px] font-light text-[var(--cacao)] md:flex lg:gap-6 lg:text-sm">
          {links.map(([t, h]) => (
            <a key={t} href={h} className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-[var(--amber)] after:transition-all after:duration-300 hover:after:w-full">
              {t}
            </a>
          ))}
        </nav>
        <button
          className="relative p-2 text-[var(--cacao)] transition-colors hover:text-[var(--amber)]"
          onClick={onCartClick}
          aria-label={`Cart, ${count} items`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M5 8h14l-1 12H6L5 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <span className="font-body absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--cacao)] px-1 text-[10px] text-[var(--paper)]">
            {count}
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;