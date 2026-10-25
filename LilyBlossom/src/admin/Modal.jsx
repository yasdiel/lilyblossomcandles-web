import { useEffect, useId, useRef } from "react";

export default function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
  busy = false,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstField = panelRef.current?.querySelector(
      'input:not([type="file"]):not([type="hidden"]), textarea, select',
    );
    firstField?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => {
          if (!busy) onClose();
        }}
        className="fixed inset-0 cursor-default bg-[#2F211A]/45 backdrop-blur-[2px]"
      />

      <div className="relative flex min-h-full items-start justify-center p-4 sm:items-center">
        <section
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`relative my-4 w-full border border-[var(--ash)] bg-[var(--bone)] shadow-2xl ${
            wide ? "max-w-3xl" : "max-w-lg"
          }`}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--ash)] bg-[var(--bone)] px-6 py-5">
            <div>
              <h2 id={titleId} className="font-display text-3xl text-[var(--cacao)]">
                {title}
              </h2>
              {description && (
                <p className="font-body mt-1 text-sm font-light text-[var(--muted)]">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Cerrar"
              className="mt-1 text-2xl leading-none text-[var(--muted)] transition-colors hover:text-[var(--cacao)] disabled:opacity-40"
            >
              ×
            </button>
          </header>

          <div className="px-6 py-6">{children}</div>
        </section>
      </div>
    </div>
  );
}
