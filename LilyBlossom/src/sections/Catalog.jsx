import Candle from "../components/Candle";
import { assetUrl } from "../lib/api";
import { formatPrice } from "../lib/money";

export function Catalog({ products, onAdd }) {
  return (
    <section id="coleccion" className="border-t border-[var(--ash)] bg-[var(--paper)]">
      <div className="mx-auto w-full px-6 py-14">
        <div className="mb-8 w-full">
          <h2 className="font-display text-4xl text-[var(--cacao)] md:text-5xl">The collection</h2>
          <p className="font-body mt-4 font-light text-[var(--muted)]">
            Small-batch scents, hand-poured and photographed in our workshop.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="font-body border border-[var(--ash)] bg-[var(--bone)] px-6 py-10 text-center font-light text-[var(--muted)]">
            New candles are on their way. Come back soon.
          </p>
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <article key={p.id} className="group flex flex-col">
                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden border border-[var(--ash)] bg-[var(--bone)] transition-colors duration-500 group-hover:bg-[#E2D5BF]">
                  {p.imagen_url ? (
                    <img
                      src={assetUrl(p.imagen_url)}
                      alt={p.nombre}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="transition-transform duration-500 group-hover:-translate-y-1">
                      <Candle vaso={p.vaso} cera={p.cera} size={130} />
                    </div>
                  )}
                </div>
                <h3 className="font-display mt-5 text-2xl text-[var(--cacao)]">{p.nombre}</h3>
                <p className="font-body mt-1 text-sm font-light italic text-[var(--muted)]">{p.notas}</p>
                <div className="font-body mt-4 flex items-baseline justify-between border-t border-[var(--ash)] pt-4 text-sm">
                  <span className="font-light text-[var(--muted)]">{p.peso}</span>
                  <span className="text-base text-[var(--cacao)]">{formatPrice(p.precio)}</span>
                </div>
                <button
                  onClick={() => onAdd(p)}
                  className="font-body mt-4 border border-[var(--ash)] py-2.5 text-sm text-[var(--cacao)] transition-colors duration-300 hover:border-[var(--cacao)] hover:bg-[var(--cacao)] hover:text-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)]"
                >
                  Add to cart
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Catalog;
