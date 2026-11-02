import { useEffect, useState } from "react";
import Candle from "../components/Candle";

const HERO_IMAGES = ["/fondo-1.jpg", "/fondo-2.jpg", "/fondo-3.jpg"];
const SLIDE_INTERVAL = 6000;

export function Hero() {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % HERO_IMAGES.length);
    }, SLIDE_INTERVAL);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      id="inicio"
      className="relative isolate mx-auto grid min-h-[78svh] w-full grid-cols-1 items-center gap-6 overflow-hidden px-6 py-16 md:min-h-0 md:grid-cols-2 md:py-10"
    >
      <div className="absolute inset-0 -z-10 md:hidden" aria-hidden="true">
        {HERO_IMAGES.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`hero-slide absolute inset-0 h-full w-full object-cover ${
              index === activeImage ? "is-active" : ""
            }`}
            loading="eager"
            decoding="async"
          />
        ))}
        <div className="hero-scrim absolute inset-0" />
      </div>

      <div className="min-w-0">
        <h1 className="font-display text-4xl font-normal leading-[1.05] text-[var(--paper)] drop-shadow-[0_2px_18px_rgba(0,0,0,.35)] md:text-6xl md:text-[var(--cacao)] md:drop-shadow-none">
          Slow light for <br className="hidden md:block" />
          quiet hours.
        </h1>
        <p className="font-body mt-4 max-w-md text-base font-light leading-relaxed text-[var(--paper)] drop-shadow-[0_1px_12px_rgba(0,0,0,.45)] md:text-[var(--muted)] md:drop-shadow-none">
          Hand-poured candles in small batches, with soy wax and scents that linger in memory.
        </p>
        <button
          onClick={() => document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" })}
          className="font-body mt-6 border border-[var(--paper)] bg-[var(--paper)] px-8 py-3.5 text-sm tracking-wide text-[var(--cacao)] transition-all duration-300 hover:bg-transparent hover:text-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--paper)] md:border-[var(--cacao)] md:bg-[var(--cacao)] md:text-[var(--paper)] md:hover:bg-transparent md:hover:text-[var(--cacao)] md:focus-visible:outline-[var(--amber)]"
        >
          Explore collection
        </button>
      </div>

      <div className="relative hidden aspect-[4/5] items-center justify-center overflow-hidden border border-[var(--ash)] bg-[var(--paper)] md:flex md:h-[420px] md:aspect-auto">
        <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_55%,rgba(141,74,39,.22),transparent_65%)]" />
        <div className="relative pb-4">
          <Candle vaso="var(--sage)" cera="#EFE6D6" size={130} lit />
        </div>
      </div>
    </section>
  );
}

export default Hero;
