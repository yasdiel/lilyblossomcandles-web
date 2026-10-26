import { useEffect, useId, useRef, useState } from "react";

const EMAIL = "lilyblossomcandles@gmail.com";
const SUBJECT = "Custom order inquiry";
const BODY = `Hello Lily Blossom Candles,

I would like to request a custom order.

Scent:
Quantity:
Occasion:

Thank you.`;

const GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${encodeURIComponent(
  SUBJECT,
)}&body=${encodeURIComponent(BODY)}`;

const MAILTO_URL = `mailto:${EMAIL}?subject=${encodeURIComponent(
  SUBJECT,
)}&body=${encodeURIComponent(BODY)}`;

async function copyEmail() {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(EMAIL);
      return;
    } catch {
      // Si el navegador bloquea el portapapeles, probamos el método clásico.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = EMAIL;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CustomOrderDialog({ open, onClose }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await copyEmail();
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-[#2F211A]/45 backdrop-blur-[2px]"
      />

      <div className="relative flex min-h-full items-start justify-center p-4 sm:items-center">
        <section
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative my-4 w-full max-w-lg border border-[var(--ash)] bg-[var(--bone)] shadow-2xl outline-none"
        >
          <header className="flex items-start justify-between gap-4 border-b border-[var(--ash)] px-6 py-5 sm:px-8">
            <div>
              <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
                Custom orders
              </p>
              <h2
                id={titleId}
                className="font-display mt-3 text-3xl leading-tight text-[var(--cacao)] sm:text-4xl"
              >
                Let’s create something personal.
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="mt-1 text-2xl leading-none text-[var(--muted)] transition-colors hover:text-[var(--cacao)]"
            >
              ×
            </button>
          </header>

          <div className="px-6 py-6 sm:px-8">
            <p className="font-body text-[15px] font-light leading-[1.85] text-[var(--muted)]">
              Tell us which scent, quantity, and occasion you have in mind.
              We’ll reply with options, timing, and pricing.
            </p>

            <div className="mt-6 border-y border-[var(--ash)] py-5">
              <p className="font-body text-[10px] uppercase tracking-[0.24em] text-[var(--amber)]">
                Write to us
              </p>
              <p className="font-display mt-2 break-all text-2xl text-[var(--cacao)]">
                {EMAIL}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={GMAIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body flex-1 border border-[var(--cacao)] bg-[var(--cacao)] px-5 py-3 text-center text-sm tracking-wide text-[var(--paper)] transition-colors duration-300 hover:bg-transparent hover:text-[var(--cacao)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--amber)]"
              >
                Open Gmail
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="font-body flex-1 border border-[var(--ash)] px-5 py-3 text-sm text-[var(--cacao)] transition-colors duration-300 hover:border-[var(--cacao)] hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--amber)]"
              >
                {copied ? "Email copied" : "Copy email"}
              </button>
            </div>

            <a
              href={MAILTO_URL}
              className="font-body mt-5 inline-block text-xs font-light text-[var(--muted)] underline decoration-[var(--ash)] underline-offset-4 transition-colors hover:text-[var(--cacao)]"
            >
              Use another email app
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CustomOrderDialog;
