import { useState } from "react";
import { assetUrl } from "../lib/api";
import { formatEuroPrice } from "../lib/money";

const ORDER_EMAIL = "lilyblossomcandles@gmail.com";

function EventCard({ event, index }) {
  const prices = event.precios || [];
  const [selectedPrice, setSelectedPrice] = useState(prices[0] || null);

  const orderHref = selectedPrice
    ? `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(
        `Event candle order - ${event.nombre}`,
      )}&body=${encodeURIComponent(
        `Hello Lily Blossom Candles,\n\nI would like to order this event candle package:\n\nProduct: ${event.nombre}\nQuantity: ${selectedPrice.unidades} ${
          selectedPrice.unidades === 1 ? "candle" : "candles"
        }\nPackage price: ${formatEuroPrice(selectedPrice.precio)}\n\nThank you.`,
      )}`
    : null;

  return (
    <article className="group">
      <div className="aspect-[4/5] overflow-hidden border border-[var(--ash)] bg-[var(--paper)]">
        {event.imagen_url ? (
          <img
            src={assetUrl(event.imagen_url)}
            alt={event.nombre}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-body text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Event piece
            </span>
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-4">
        <span className="font-body mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--amber)]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl leading-tight text-[var(--cacao)] md:text-3xl">
            {event.nombre}
          </h3>
          {event.descripcion && (
            <p className="font-body mt-2 text-sm font-light leading-relaxed text-[var(--muted)]">
              {event.descripcion}
            </p>
          )}
          {prices.length > 0 && (
            <div className="mt-5">
              <p className="font-body mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Choose your quantity
              </p>
              <fieldset className="space-y-2">
                <legend className="sr-only">
                  Choose a price for {event.nombre}
                </legend>
                {prices.map((price) => {
                  const isSelected = selectedPrice?.unidades === price.unidades;
                  return (
                    <label
                      key={price.unidades}
                      className={`font-body flex w-full cursor-pointer items-center justify-between gap-3 border px-4 py-3 text-left transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--amber)] ${
                        isSelected
                          ? "border-[var(--cacao)] bg-[var(--cacao)] text-[var(--paper)]"
                          : "border-[var(--ash)] bg-[var(--paper)] text-[var(--cacao)] hover:border-[var(--cacao)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`event-price-${event.id}`}
                        value={price.unidades}
                        checked={isSelected}
                        onChange={() => setSelectedPrice(price)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-[var(--paper)]"
                              : "border-[var(--ash)]"
                          }`}
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-[var(--paper)]" />
                          )}
                        </span>
                        <span className="text-sm">
                          {price.unidades}{" "}
                          {price.unidades === 1 ? "candle" : "candles"}
                        </span>
                      </span>
                      <span className="text-sm font-medium">
                        {formatEuroPrice(price.precio)}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              {selectedPrice && (
                <a
                  href={orderHref}
                  className="font-body mt-3 block border border-[var(--cacao)] bg-[var(--cacao)] px-4 py-3 text-center text-sm tracking-wide text-[var(--paper)] transition-colors hover:bg-transparent hover:text-[var(--cacao)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)]"
                >
                  Request {selectedPrice.unidades}{" "}
                  {selectedPrice.unidades === 1 ? "candle" : "candles"}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function Events({ events, status, onRetry }) {
  return (
    <section
      id="eventos"
      className="scroll-mt-24 border-t border-[var(--ash)] bg-[var(--bone)]"
    >
      <div className="mx-auto w-full px-6 py-16 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
              For celebrations
            </p>
            <h2 className="font-display mt-5 max-w-xl text-4xl font-normal leading-[1.08] text-[var(--cacao)] md:text-6xl">
              Candles for
              <span className="mt-1 block italic">your events</span>
            </h2>
          </div>

          <div className="lg:pb-2">
            <p className="font-body max-w-xl text-[15px] font-light leading-[1.95] text-[var(--muted)] md:text-base">
              From wedding tables to intimate gatherings, we create candles
              that carry the mood of your moment. Browse a few of our event
              pieces or tell us what you are planning.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <a
                href="#custom-orders"
                className="font-body border border-[var(--cacao)] bg-[var(--cacao)] px-6 py-3 text-sm tracking-wide text-[var(--paper)] transition-all duration-300 hover:bg-transparent hover:text-[var(--cacao)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--amber)]"
              >
                Plan a custom order
              </a>
              <p className="font-body text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Weddings
                <span aria-hidden="true" className="mx-2 text-[var(--ash)]">
                  ·
                </span>
                Showers
                <span aria-hidden="true" className="mx-2 text-[var(--ash)]">
                  ·
                </span>
                Tables
              </p>
            </div>
          </div>
        </div>

        {status === "loading" ? (
          <div
            className="font-body mt-12 flex items-center justify-center gap-3 border border-[var(--ash)] bg-[var(--paper)] px-6 py-10 font-light text-[var(--muted)]"
            role="status"
            aria-live="polite"
          >
            <span className="h-5 w-5 animate-spin rounded-full border border-[var(--ash)] border-t-[var(--amber)]" />
            Preparing the event collection…
          </div>
        ) : status === "error" ? (
          <div className="font-body mt-12 border border-[var(--ash)] bg-[var(--paper)] px-6 py-10 text-center font-light text-[var(--muted)]">
            <p>We couldn’t load the event collection right now.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 border border-[var(--ash)] px-5 py-2.5 text-sm text-[var(--cacao)] transition-colors duration-300 hover:border-[var(--cacao)] hover:bg-[var(--cacao)] hover:text-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)]"
            >
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="font-body mt-12 border border-[var(--ash)] bg-[var(--paper)] px-6 py-10 text-center font-light text-[var(--muted)]">
            <p className="font-display text-2xl italic text-[var(--cacao)]">
              The first event pieces are on their way.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed">
              Tell us what you are celebrating and we’ll design something made
              for the occasion.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Events;
