import Candle from "../components/Candle";

export function Hero() {
  return (
    <section id="inicio" className="mx-auto grid w-full items-center gap-6 px-6 py-8 md:grid-cols-2 md:py-10">
      <div>
        <h1 className="font-display text-4xl font-normal leading-[1.05] text-[var(--cacao)] md:text-6xl">
          Slow light for <br className="hidden md:block" />
          quiet hours.
        </h1>
        <p className="font-body mt-4 max-w-md text-base font-light leading-relaxed text-[var(--muted)]">
          Hand-poured candles in small batches, with soy wax and scents that linger in memory.
        </p>
        <button
          onClick={() => document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" })}
          className="font-body mt-6 border border-[var(--cacao)] bg-[var(--cacao)] px-8 py-3.5 text-sm tracking-wide text-[var(--paper)] transition-all duration-300 hover:bg-transparent hover:text-[var(--cacao)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--amber)]"
        >
          Explore collection
        </button>
      </div>

      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden border border-[var(--ash)] bg-[var(--paper)] md:h-[420px] md:aspect-auto">
        <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_55%,rgba(141,74,39,.22),transparent_65%)]" />
        <div className="relative pb-4">
          <Candle vaso="var(--sage)" cera="#EFE6D6" size={130} lit />
        </div>
      </div>
    </section>
  );
}

export default Hero;