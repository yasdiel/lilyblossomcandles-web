import { useEffect, useState } from "react";
import { THEME } from "./theme";
import { PRODUCTS as FALLBACK_PRODUCTS } from "./data/products";
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
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);

  useEffect(() => {
    let active = true;

    api.products
      .list()
      .then((list) => {
        if (active && Array.isArray(list)) setProducts(list);
      })
      .catch((error) => {
        console.warn(
          "No se pudo cargar el catálogo desde la API; se muestra la selección local.",
          error,
        );
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="font-body min-h-screen bg-[var(--bone)] text-[var(--cacao)]">
      <style>{THEME}</style>
      <Header count={count} onCartClick={openCart} />
      <main>
        <Hero />
        <About />
        <Catalog products={products} onAdd={addToCart} />
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
