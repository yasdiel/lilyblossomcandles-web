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

  const retryCatalog = () => {
    setCatalogAttempt((attempt) => attempt + 1);
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
