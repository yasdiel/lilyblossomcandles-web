import { useCallback, useEffect, useState } from "react";
import { THEME } from "./theme";
import { api } from "./lib/api";
import { useCart } from "./hooks/useCart";
import Contact from "./components/Contact";
import CartDrawer from "./components/CartDrawer";
import CheckoutDialog from "./components/CheckoutDialog";
import Hero from "./sections/Hero";
import About from "./sections/About";
import Catalog from "./sections/Catalog";
import Events from "./sections/Events";
import CustomScents from "./sections/CustomScents";
import ConsciousChoice from "./sections/ConsciousChoice";

export default function Storefront() {
  const {
    cart,
    isOpen,
    openCart,
    closeCart,
    addToCart,
    removeFromCart,
    updateQty,
    count,
    totals,
  } = useCart();
  const [products, setProducts] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [events, setEvents] = useState([]);
  const [eventsStatus, setEventsStatus] = useState("loading");
  const [eventsAttempt, setEventsAttempt] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const openCheckout = useCallback(() => {
    closeCart();
    setIsCheckoutOpen(true);
  }, [closeCart]);

  const closeCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
  }, []);

  useEffect(() => {
    let active = true;
    setCatalogStatus("loading");

    api.products
      .list()
      .then((list) => {
        if (!active) return;
        setProducts(Array.isArray(list) ? list : []);
        setCatalogStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        console.error("No se pudo cargar el catálogo desde la API.", error);
        setCatalogStatus("error");
      });

    return () => {
      active = false;
    };
  }, [catalogAttempt]);

  useEffect(() => {
    let active = true;
    setEventsStatus("loading");

    api.events
      .list()
      .then((list) => {
        if (!active) return;
        setEvents(Array.isArray(list) ? list : []);
        setEventsStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        console.error("No se pudieron cargar los productos para eventos.", error);
        setEventsStatus("error");
      });

    return () => {
      active = false;
    };
  }, [eventsAttempt]);

  const retryCatalog = () => {
    setCatalogAttempt((attempt) => attempt + 1);
  };

  const retryEvents = () => {
    setEventsAttempt((attempt) => attempt + 1);
  };

  return (
    <div className="font-body min-h-screen bg-[var(--bone)] text-[var(--cacao)]">
      <style>{THEME}</style>
      <main>
        <Hero />
        <About />
        <Catalog
          products={products}
          status={catalogStatus}
          onRetry={retryCatalog}
          onAdd={addToCart}
        />
        <Events events={events} status={eventsStatus} onRetry={retryEvents} onAdd={addToCart} />
        <CustomScents />
        <ConsciousChoice />
      </main>
      <Contact />
      {count > 0 && !isOpen && !isCheckoutOpen && (
        <button
          type="button"
          onClick={openCart}
          className="font-body fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--cacao)] bg-[var(--cacao)] px-6 py-3 text-sm text-[var(--paper)] shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--amber)]"
        >
          View order
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--paper)] px-1.5 text-xs text-[var(--cacao)]">
            {count}
          </span>
        </button>
      )}
      <CartDrawer
        cart={cart}
        isOpen={isOpen}
        onClose={closeCart}
        onRemove={removeFromCart}
        onUpdateQty={updateQty}
        onCheckout={openCheckout}
        totals={totals}
      />
      <CheckoutDialog
        open={isCheckoutOpen}
        cart={cart}
        totals={totals}
        onClose={closeCheckout}
      />
    </div>
  );
}
