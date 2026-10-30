import { useEffect, useState } from "react";
import { THEME } from "./theme";
import { api } from "./lib/api";
import { useCart } from "./hooks/useCart";
import Header from "./components/Header";
import Contact from "./components/Contact";
import CartDrawer from "./components/CartDrawer";
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
    total,
  } = useCart();
  const [products, setProducts] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [events, setEvents] = useState([]);
  const [eventsStatus, setEventsStatus] = useState("loading");
  const [eventsAttempt, setEventsAttempt] = useState(0);

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
      <Header count={count} onCartClick={openCart} />
      <main>
        <Hero />
        <About />
        <Catalog
          products={products}
          status={catalogStatus}
          onRetry={retryCatalog}
          onAdd={addToCart}
        />
        <Events events={events} status={eventsStatus} onRetry={retryEvents} />
        <CustomScents />
        <ConsciousChoice />
      </main>
      <Contact />
      <CartDrawer
        cart={cart}
        isOpen={isOpen}
        onClose={closeCart}
        onRemove={removeFromCart}
        onUpdateQty={updateQty}
        total={total}
      />
    </div>
  );
}
