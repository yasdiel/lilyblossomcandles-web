import Logo from "./Logo";

export function Contact() {
  return (
    <footer id="contacto" className="border-t border-[var(--ash)] bg-[var(--paper)]">
      <div className="font-body mx-auto flex w-full flex-col items-center justify-between gap-3 px-6 py-8 text-sm font-light text-[var(--muted)] md:flex-row">
        <Logo />
        <p>lilyblossomcandles@gmail.com · @lilyblossomcandles</p>
        <p>© 2026 Lily Blossom Candles</p>
      </div>
    </footer>
  );
}

export default Contact;