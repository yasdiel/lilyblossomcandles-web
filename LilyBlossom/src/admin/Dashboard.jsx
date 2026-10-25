import { useCallback, useEffect, useState } from "react";
import Candle from "../components/Candle";
import { api, assetUrl } from "../lib/api";
import { formatPrice } from "../lib/money";
import PasswordDialog from "./PasswordDialog";
import ProductForm from "./ProductForm";

function SkeletonCard() {
  return (
    <div className="flex animate-pulse gap-4 border border-[var(--ash)] bg-[var(--paper)] p-4">
      <div className="h-32 w-24 shrink-0 bg-[var(--ash)]/40" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-5 w-2/3 bg-[var(--ash)]/40" />
        <div className="h-3 w-full bg-[var(--ash)]/30" />
        <div className="h-3 w-1/2 bg-[var(--ash)]/30" />
        <div className="mt-8 h-8 w-full bg-[var(--ash)]/20" />
      </div>
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const list = await api.admin.products();
      return { list: Array.isArray(list) ? list : [] };
    } catch (error) {
      return { error };
    }
  }, []);

  const applyProductsResult = useCallback(
    ({ list, error }) => {
      if (error) {
        if (error.status === 401) {
          onLogout();
          return;
        }
        setLoadError(error.message || "No se pudieron cargar los productos.");
        setLoading(false);
        return;
      }
      setLoadError("");
      setProducts(list);
      setLoading(false);
    },
    [onLogout],
  );

  useEffect(() => {
    let active = true;
    fetchProducts().then((result) => {
      if (active) applyProductsResult(result);
    });
    return () => {
      active = false;
    };
  }, [applyProductsResult, fetchProducts]);

  const refreshProducts = () => {
    setLoading(true);
    setLoadError("");
    fetchProducts().then(applyProductsResult);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openNewProduct = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditProduct = (product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const closePassword = useCallback(() => {
    setPasswordOpen(false);
  }, []);

  const handleSaved = (saved, isNew) => {
    setProducts((current) =>
      isNew
        ? [...current, saved]
        : current.map((item) => (item.id === saved.id ? saved : item)),
    );
    setFormOpen(false);
    setEditing(null);
    showToast(isNew ? "Producto creado correctamente." : "Cambios guardados correctamente.");
  };

  const handleDelete = async (product) => {
    setDeletingId(product.id);
    try {
      await api.admin.deleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setConfirmDelete(null);
      showToast("Producto eliminado.");
    } catch (error) {
      if (error.status === 401) {
        onLogout();
        return;
      }
      showToast(error.message || "No se pudo eliminar el producto.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const published = products.filter((product) => product.activo).length;
  const hidden = products.length - published;

  return (
    <>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="flex flex-col gap-6 border-b border-[var(--ash)] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
              Panel de administración
            </p>
            <h1 className="font-display mt-3 text-4xl text-[var(--cacao)] md:text-5xl">Tu colección</h1>
            <p className="font-body mt-3 max-w-xl text-sm font-light leading-relaxed text-[var(--muted)]">
              Publica nuevas velas, cambia precios y fotos, o guarda productos como borrador.
              Los cambios se ven en la tienda al instante.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewProduct}
            className="font-body inline-flex shrink-0 items-center justify-center gap-2 border border-[var(--cacao)] bg-[var(--cacao)] px-6 py-3 text-sm tracking-wide text-[var(--paper)] transition-all duration-300 hover:bg-transparent hover:text-[var(--cacao)]"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Nuevo producto
          </button>
        </div>

        <div className="mt-7 grid max-w-lg grid-cols-3 gap-3">
          <div className="border border-[var(--ash)] bg-[var(--paper)] px-4 py-3">
            <p className="font-display text-3xl text-[var(--cacao)]">{products.length}</p>
            <p className="font-body mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Total
            </p>
          </div>
          <div className="border border-[var(--ash)] bg-[var(--paper)] px-4 py-3">
            <p className="font-display text-3xl text-[var(--cacao)]">{published}</p>
            <p className="font-body mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Publicados
            </p>
          </div>
          <div className="border border-[var(--ash)] bg-[var(--paper)] px-4 py-3">
            <p className="font-display text-3xl text-[var(--cacao)]">{hidden}</p>
            <p className="font-body mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Ocultos
            </p>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-[var(--cacao)]">Productos</h2>
            <p className="font-body mt-1 text-xs font-light text-[var(--muted)]">
              Gestiona el catálogo de la tienda.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshProducts}
            disabled={loading}
            className="font-body text-xs uppercase tracking-[0.12em] text-[var(--muted)] underline decoration-[var(--ash)] underline-offset-4 transition-colors hover:text-[var(--cacao)] disabled:opacity-40"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : loadError ? (
          <div className="mt-5 border border-[#A64B3C]/40 bg-[#A64B3C]/10 px-6 py-8 text-center">
            <p className="font-body text-sm text-[#7E3529]">{loadError}</p>
            <button
              type="button"
              onClick={refreshProducts}
              className="font-body mt-4 border border-[#7E3529] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[#7E3529] transition-colors hover:bg-[#7E3529] hover:text-[var(--bone)]"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-5 border border-[var(--ash)] bg-[var(--paper)] px-6 py-14 text-center">
            <h3 className="font-display text-3xl text-[var(--cacao)]">Aún no hay productos</h3>
            <p className="font-body mx-auto mt-2 max-w-sm text-sm font-light leading-relaxed text-[var(--muted)]">
              Crea tu primera vela para que aparezca en la colección de la tienda.
            </p>
            <button
              type="button"
              onClick={openNewProduct}
              className="font-body mt-6 border border-[var(--cacao)] bg-[var(--cacao)] px-5 py-2.5 text-sm text-[var(--paper)] transition-colors hover:bg-transparent hover:text-[var(--cacao)]"
            >
              Crear primer producto
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.id}
                className="flex gap-4 border border-[var(--ash)] bg-[var(--paper)] p-4 transition-colors hover:border-[var(--cacao)]/40"
              >
                <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden border border-[var(--ash)] bg-[var(--bone)]">
                  {product.imagen_url ? (
                    <img
                      src={assetUrl(product.imagen_url)}
                      alt={product.nombre}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Candle vaso={product.vaso} cera={product.cera} size={62} />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display break-words text-xl leading-tight text-[var(--cacao)]">
                      {product.nombre}
                    </h3>
                    <span
                      className={`font-body shrink-0 px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${
                        product.activo
                          ? "bg-[var(--cacao)] text-[var(--paper)]"
                          : "border border-[var(--ash)] text-[var(--muted)]"
                      }`}
                    >
                      {product.activo ? "Publicado" : "Oculto"}
                    </span>
                  </div>

                  <p className="font-body mt-1 line-clamp-2 text-xs font-light italic leading-relaxed text-[var(--muted)]">
                    {product.notas || "Sin notas olfativas"}
                  </p>

                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <div>
                      <p className="font-body text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                        {product.peso || "Sin medida"}
                      </p>
                      <p className="font-body mt-0.5 text-base text-[var(--cacao)]">
                        {formatPrice(product.precio)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--ash)] pt-3">
                    <button
                      type="button"
                      onClick={() => openEditProduct(product)}
                      className="font-body text-xs uppercase tracking-[0.1em] text-[var(--cacao)] underline decoration-[var(--ash)] underline-offset-4 transition-colors hover:text-[var(--amber)]"
                    >
                      Editar
                    </button>

                    {confirmDelete === product.id ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                          className="font-body text-xs font-medium text-[#7E3529] transition-opacity hover:opacity-70 disabled:cursor-wait disabled:opacity-50"
                        >
                          {deletingId === product.id ? "Eliminando…" : "Confirmar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          disabled={deletingId === product.id}
                          className="font-body text-xs text-[var(--muted)] transition-colors hover:text-[var(--cacao)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(product.id)}
                        className="font-body text-xs text-[var(--muted)] transition-colors hover:text-[#7E3529]"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="mt-14 border-t border-[var(--ash)] pt-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl text-[var(--cacao)]">Seguridad</h2>
              <p className="font-body mt-1 text-sm font-light text-[var(--muted)]">
                Cuenta: <span className="text-[var(--cacao)]">{user.email}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="font-body self-start border border-[var(--ash)] px-4 py-2.5 text-xs uppercase tracking-[0.1em] text-[var(--cacao)] transition-colors hover:border-[var(--cacao)] hover:bg-[var(--cacao)] hover:text-[var(--paper)] md:self-auto"
            >
              Cambiar contraseña
            </button>
          </div>
        </section>
      </main>

      {formOpen && (
        <ProductForm
          key={editing?.id ?? "new"}
          product={editing}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {passwordOpen && (
        <PasswordDialog
          onClose={closePassword}
          onSaved={(message) => {
            setPasswordOpen(false);
            showToast(message);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 border px-4 py-3 shadow-xl ${
            toast.type === "error"
              ? "border-[#A64B3C]/40 bg-[#F7E9E6] text-[#7E3529]"
              : "border-[#6A7A5B]/40 bg-[#EEF1E8] text-[#45523A]"
          }`}
        >
          <p className="font-body text-sm leading-relaxed">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar aviso"
            className="ml-2 text-lg leading-none opacity-60 transition-opacity hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
