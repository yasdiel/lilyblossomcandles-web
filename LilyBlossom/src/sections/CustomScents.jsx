import { useCallback, useState } from "react";
import CustomOrderDialog from "../components/CustomOrderDialog";

const SCENTS = [
  { name: "Sakura", notes: "Floral" },
  { name: "Vanilla Pumpkin", notes: "Sweet" },
  { name: "Relaxing Moment", notes: "Lavender, sandalwood, cinnamon" },
  { name: "Lotus Flower", notes: "Violet, musk, amber" },
  { name: "Christmas Spices", notes: "Vanilla, honey, orange, cinnamon" },
  {
    name: "Amber & Saffron",
    notes: "Cedar, vanilla, amber, musk, white flowers",
  },
];

export function CustomScents() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return (
    <section
      id="custom-orders"
      className="scroll-mt-24 border-t border-[var(--ash)] bg-[var(--bone)]"
    >
      <div className="mx-auto w-full px-6 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
              Made for you
            </p>
            <h2 className="font-display mt-5 max-w-lg text-4xl font-normal leading-[1.08] text-[var(--cacao)] md:text-6xl">
              Scents for
              <span className="mt-1 block italic">Custom Orders</span>
            </h2>
            <div className="mt-8 flex max-w-md gap-4">
              <span className="mt-3 h-px w-10 shrink-0 bg-[var(--amber)]" />
              <p className="font-display text-xl italic leading-snug text-[var(--cacao)] md:text-2xl">
                A fragrance wardrobe for your most personal celebrations.
              </p>
            </div>
            <p className="font-body mt-8 max-w-md text-[15px] font-light leading-[1.95] text-[var(--muted)] md:text-base">
              Choose a scent below and tell us about the moment you want to
              create. We’ll craft it in the size, vessel, and finish that feels
              right for your celebration.
            </p>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="font-body mt-8 inline-block border border-[var(--cacao)] bg-[var(--cacao)] px-7 py-3 text-sm tracking-wide text-[var(--paper)] transition-all duration-300 hover:bg-transparent hover:text-[var(--cacao)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--amber)]"
            >
              Request a custom order
            </button>
            <p className="font-body mt-5 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Made to order
              <span aria-hidden="true" className="mx-2 text-[var(--ash)]">
                ·
              </span>
              Small batches
            </p>
          </div>

          <div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {SCENTS.map((scent, index) => (
                <article
                  key={scent.name}
                  className="group border-t border-[var(--ash)] py-6"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-body text-[10px] uppercase tracking-[0.24em] text-[var(--amber)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 bg-[var(--ash)] transition-colors duration-300 group-hover:bg-[var(--amber)]" />
                  </div>
                  <h3 className="font-display mt-4 text-2xl text-[var(--cacao)] md:text-3xl">
                    {scent.name}
                  </h3>
                  <p className="font-body mt-2 text-sm font-light italic leading-relaxed text-[var(--muted)]">
                    {scent.notes}
                  </p>
                </article>
              ))}
            </div>
            <p className="font-body border-t border-[var(--ash)] pt-6 text-sm font-light leading-relaxed text-[var(--muted)]">
              Not sure which scent fits your occasion? Write to us and we’ll
              help you find the right one.
            </p>
          </div>
        </div>
      </div>

      <CustomOrderDialog open={dialogOpen} onClose={closeDialog} />
    </section>
  );
}

export default CustomScents;
