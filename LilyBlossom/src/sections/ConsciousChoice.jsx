const INGREDIENTS = [
  "100% plant-based wax",
  "Free from paraffin",
  "Hand-poured in small batches",
];

export function ConsciousChoice() {
  return (
    <section
      id="ingredients"
      className="scroll-mt-24 border-t border-[var(--ash)] bg-[var(--bone)]"
    >
      <div className="mx-auto w-full px-6 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
              Our ingredients
            </p>
            <h2 className="font-display mt-5 max-w-lg text-4xl font-normal leading-[1.08] text-[var(--cacao)] md:text-5xl">
              A More Conscious Choice for Your Home
            </h2>
            <div className="mt-8 flex max-w-md gap-4">
              <span className="mt-3 h-px w-10 shrink-0 bg-[var(--amber)]" />
              <p className="font-display text-xl italic leading-snug text-[var(--cacao)] md:text-2xl">
                Beautiful candles, thoughtful ingredients, a more conscious home.
              </p>
            </div>
          </div>

          <div>
            <p className="font-body max-w-2xl text-[15px] font-light leading-[1.95] text-[var(--muted)] md:text-base">
              At Lily Blossom Candles, we believe that what we bring into our
              homes matters. That’s why we choose 100% plant-based wax, free from
              paraffin, for all our candles. We want to inspire a more conscious
              way of enjoying fragrance and creating beautiful moments at home,
              with greater awareness of the ingredients we choose and the spaces
              we share with the people we love.
            </p>

            <ul className="mt-10 grid gap-x-8 gap-y-5 sm:grid-cols-3">
              {INGREDIENTS.map((ingredient, index) => (
                <li
                  key={ingredient}
                  className="border-t border-[var(--ash)] pt-4"
                >
                  <span className="font-body text-[10px] uppercase tracking-[0.24em] text-[var(--amber)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="font-body mt-2 text-sm leading-relaxed text-[var(--cacao)]">
                    {ingredient}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ConsciousChoice;
