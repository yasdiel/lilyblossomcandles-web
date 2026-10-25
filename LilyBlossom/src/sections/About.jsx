export function About() {
  return (
    <section
      id="nosotros"
      className="scroll-mt-24 border-t border-[var(--ash)]"
    >
      <div className="mx-auto grid w-full gap-12 px-6 py-16 md:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
            Our story
          </p>
          <h2 className="font-display mt-5 text-4xl font-normal leading-[1.05] text-[var(--cacao)] md:text-6xl">
            Made to Be Felt.
            <span className="mt-1 block italic">Created to Be Remembered.</span>
          </h2>
          <p className="font-body mt-9 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Made slowly
            <span aria-hidden="true" className="mx-2 text-[var(--ash)]">
              ·
            </span>
            Hand-poured
            <span aria-hidden="true" className="mx-2 text-[var(--ash)]">
              ·
            </span>
            Small batches
          </p>
        </div>

        <div className="font-body max-w-2xl space-y-6 text-[15px] font-light leading-[1.95] text-[var(--muted)] md:text-base">
          <p className="text-lg leading-[1.75] text-[var(--cacao)] md:text-xl">
            At Lily Blossom Candles, we believe that beauty lives in the little
            details and that life’s most special moments deserve more than a
            gift—they deserve a memory.
          </p>
          <p>
            Each candle is created with love, inspired by the delicate beauty of
            flowers and the magic of fragrances that make us feel, remember, and
            connect.
          </p>
          <p>
            We craft handmade candles with care and dedication, designed to bring
            calm to your everyday moments, celebrate life’s most meaningful
            occasions, and express what words sometimes cannot.
          </p>
          <figure className="border-y border-[var(--ash)] py-7">
            <blockquote className="font-display text-2xl leading-snug text-[var(--cacao)] md:text-[1.75rem]">
              “From a thoughtful little gift to a celebration you will cherish
              forever, we want to be part of the stories worth remembering.”
            </blockquote>
          </figure>
        </div>
      </div>
    </section>
  );
}

export default About;
