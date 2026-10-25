import Candle from "./Candle";
import { assetUrl } from "../lib/api";
import { formatPrice } from "../lib/money";

export function CartDrawer({ cart, isOpen, onClose, onRemove, onUpdateQty, total }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close cart"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[var(--ash)] bg-[var(--paper)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--ash)] px-6 py-5">
          <h2 className="font-display text-3xl text-[var(--cacao)]">Your cart</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[var(--muted)] transition-colors hover:text-[var(--cacao)]"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {cart.length === 0 ? (
            <p className="font-light text-[var(--muted)]">Your cart is empty.</p>
          ) : (
            <ul className="space-y-6">
              {cart.map((item) => (
                <li key={item.id} className="flex items-start gap-4 border-b border-[var(--ash)] pb-4">
                  <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden border border-[var(--ash)] bg-[var(--bone)]">
                    {item.imagen_url ? (
                      <img
                        src={assetUrl(item.imagen_url)}
                        alt={item.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Candle vaso={item.vaso} cera={item.cera} size={48} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl text-[var(--cacao)]">{item.nombre}</h3>
                    <p className="text-sm font-light text-[var(--muted)]">{item.peso}</p>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        className="h-7 w-7 border border-[var(--ash)] text-[var(--cacao)] transition-colors hover:border-[var(--cacao)]"
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        className="h-7 w-7 border border-[var(--ash)] text-[var(--cacao)] transition-colors hover:border-[var(--cacao)]"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="ml-auto text-xs uppercase tracking-wide text-[var(--muted)] transition-colors hover:text-[var(--cacao)]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <span className="text-base text-[var(--cacao)]">{formatPrice(item.precio * item.qty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--ash)] px-6 py-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="font-light text-[var(--muted)]">Subtotal</span>
            <span className="text-lg text-[var(--cacao)]">{formatPrice(total)}</span>
          </div>
          <button
            type="button"
            className="font-body w-full bg-[var(--cacao)] py-3.5 text-sm tracking-wide text-[var(--paper)] transition-all duration-300 hover:bg-transparent hover:text-[var(--cacao)] border border-[var(--cacao)]"
          >
            Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}

export default CartDrawer;