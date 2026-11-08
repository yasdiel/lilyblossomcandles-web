import { useEffect, useId, useRef, useState } from "react";
import { formatEuroPrice, formatPrice } from "../lib/money";

const ORDER_EMAIL = "lilyblossomcandles@gmail.com";
const INPUT_CLASS =
  "font-body mt-1 w-full border border-[var(--ash)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--cacao)] outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--cacao)]";

function formatCartPrice(value, currency) {
  return currency === "EUR" ? formatEuroPrice(value) : formatPrice(value);
}

export function CheckoutDialog({ open, cart, totals, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const [deliveryMethod, setDeliveryMethod] = useState("home");

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
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

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const deliveryMethod = formData.get("deliveryMethod");
    const deliveryLabel = {
      home: "Home delivery",
      pickup: "BPost pickup point",
      locker: "BPost locker",
    }[deliveryMethod];
    const address = [
      `${formData.get("street")}${formData.get("apartment") ? `, ${formData.get("apartment")}` : ""}`,
      `${formData.get("postalCode")} ${formData.get("city")}`,
      formData.get("country"),
    ].join("\n");
    const products = cart
      .map(
        (item) =>
          `- ${item.qty} x ${item.nombre}${item.peso ? ` (${item.peso})` : ""} — ${formatCartPrice(item.precio * item.qty, item.currency)}`,
      )
      .join("\n");
    const subtotals = Object.entries(totals).map(
      ([currency, amount]) =>
        `Subtotal (${currency}): ${formatCartPrice(amount, currency)}`,
    );
    const subject = "Candle order";
    const body = [
      "Hello Lily Blossom Candles,",
      "",
      "I would like to place this order:",
      products,
      ...subtotals,
      "",
      "Delivery details:",
      `Name: ${formData.get("fullName")}`,
      `Address:\n${address}`,
      `Email: ${formData.get("email")}`,
      `Phone: ${formData.get("phone") || "Not provided"}`,
      `Delivery preference: ${deliveryLabel}`,
      deliveryMethod !== "home"
        ? `Preferred area or location: ${formData.get("preferredLocation") || "Please suggest a location near my address"}`
        : null,
      "",
      "Thank you.",
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close checkout"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-[#2F211A]/45 backdrop-blur-[2px]"
      />
      <div className="relative flex min-h-full items-start justify-center p-4 sm:items-center">
        <section
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative my-4 w-full max-w-xl border border-[var(--ash)] bg-[var(--bone)] shadow-2xl outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--ash)] px-6 py-5 sm:px-8">
            <div>
              <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
                Checkout
              </p>
              <h2 id={titleId} className="font-display mt-2 text-3xl text-[var(--cacao)]">
                Delivery details
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
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2 sm:px-8">
              <label className="font-body text-sm text-[var(--cacao)] sm:col-span-2">
                Full name
                <input className={INPUT_CLASS} name="fullName" autoComplete="name" required />
              </label>
              <label className="font-body text-sm text-[var(--cacao)] sm:col-span-2">
                Street and number
                <input className={INPUT_CLASS} name="street" autoComplete="address-line1" required />
              </label>
              <label className="font-body text-sm text-[var(--cacao)] sm:col-span-2">
                Apartment (if applicable)
                <input className={INPUT_CLASS} name="apartment" autoComplete="address-line2" />
              </label>
              <label className="font-body text-sm text-[var(--cacao)]">
                Postal code
                <input className={INPUT_CLASS} name="postalCode" autoComplete="postal-code" required />
              </label>
              <label className="font-body text-sm text-[var(--cacao)]">
                City
                <input className={INPUT_CLASS} name="city" autoComplete="address-level2" required />
              </label>
              <label className="font-body text-sm text-[var(--cacao)] sm:col-span-2">
                Country
                <input className={INPUT_CLASS} name="country" autoComplete="country-name" required />
              </label>
              <label className="font-body text-sm text-[var(--cacao)]">
                Email address
                <input
                  className={INPUT_CLASS}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="font-body text-sm text-[var(--cacao)]">
                Phone number (optional)
                <input className={INPUT_CLASS} type="tel" name="phone" autoComplete="tel" />
              </label>

              <fieldset className="border-t border-[var(--ash)] pt-4 sm:col-span-2">
                <legend className="font-body text-sm text-[var(--cacao)]">
                  How would you like to receive your order?
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    ["home", "Home delivery"],
                    ["pickup", "BPost pickup point"],
                    ["locker", "BPost locker"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 border border-[var(--ash)] bg-[var(--paper)] px-3 py-3 text-sm text-[var(--cacao)]"
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={value}
                        checked={deliveryMethod === value}
                        onChange={() => setDeliveryMethod(value)}
                        className="accent-[var(--cacao)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {deliveryMethod !== "home" && (
                <div className="sm:col-span-2">
                  <label className="font-body text-sm text-[var(--cacao)]">
                    Preferred area or location for BPost (optional)
                    <input
                      className={INPUT_CLASS}
                      name="preferredLocation"
                      placeholder="We can suggest a nearby point or locker"
                    />
                  </label>
                  <p className="font-body mt-2 text-xs font-light text-[var(--muted)]">
                    We’ll use your city and postal code to help choose a nearby location and confirm it with you.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--ash)] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={onClose}
                className="font-body border border-[var(--ash)] px-5 py-3 text-sm text-[var(--cacao)] transition-colors hover:border-[var(--cacao)]"
              >
                Back to cart
              </button>
              <button
                type="submit"
                disabled={cart.length === 0}
                className="font-body border border-[var(--cacao)] bg-[var(--cacao)] px-5 py-3 text-sm text-[var(--paper)] transition-colors hover:bg-transparent hover:text-[var(--cacao)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to email
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default CheckoutDialog;
