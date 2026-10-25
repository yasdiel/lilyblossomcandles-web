import { useEffect, useRef, useState } from "react";
import { api, assetUrl } from "../lib/api";
import Modal from "./Modal";

const EMPTY_FORM = {
  nombre: "",
  notas: "",
  peso: "",
  precio: "",
  vaso: "#CBB089",
  cera: "#F4EEE2",
  activo: true,
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function fieldClass() {
  return "font-body mt-2 w-full border border-[var(--ash)] bg-[var(--paper)] px-3.5 py-2.5 text-sm text-[var(--cacao)] outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--cacao)]";
}

export default function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    product
      ? {
          nombre: product.nombre,
          notas: product.notas,
          peso: product.peso,
          precio: String(product.precio),
          vaso: product.vaso,
          cera: product.cera,
          activo: Boolean(product.activo),
        }
      : EMPTY_FORM,
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(() => assetUrl(product?.imagen_url));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const previewObjectUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("La foto debe ser un archivo JPG, PNG o WebP.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError("La foto no puede pasar de 5 MB.");
      return;
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(selected);
    previewObjectUrlRef.current = objectUrl;
    setPreview(objectUrl);
    setError("");
    setFile(selected);
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setFile(null);
    setRemoveImage(true);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const nombre = form.nombre.trim();
    if (!nombre) {
      setError("Escribe el nombre del producto.");
      return;
    }

    const precio = Number(form.precio);
    if (form.precio === "" || !Number.isFinite(precio) || precio < 0) {
      setError("Escribe un precio válido.");
      return;
    }

    const data = new FormData();
    data.append("nombre", nombre);
    data.append("notas", form.notas.trim());
    data.append("peso", form.peso.trim());
    data.append("precio", String(precio));
    data.append("vaso", form.vaso);
    data.append("cera", form.cera);
    data.append("activo", form.activo ? "true" : "false");
    if (file) data.append("imagen", file);
    if (removeImage) data.append("remove_image", "true");

    setSaving(true);
    try {
      const saved = product
        ? await api.admin.updateProduct(product.id, data)
        : await api.admin.createProduct(data);
      setSaving(false);
      onSaved(saved, !product);
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar el producto.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={product ? "Editar producto" : "Nuevo producto"}
      description={
        product
          ? "Cambia los detalles o la foto y guarda los cambios."
          : "Añade una vela nueva a la colección de la tienda."
      }
      onClose={onClose}
      busy={saving}
      wide
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div
            role="alert"
            className="mb-5 border border-[#A64B3C]/40 bg-[#A64B3C]/10 px-4 py-3 text-sm text-[#7E3529]"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="sm:w-40">
            <div className="aspect-[4/5] w-full overflow-hidden border border-[var(--ash)] bg-[var(--paper)] sm:w-40">
              {preview ? (
                <img src={preview} alt="Vista previa del producto" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 px-3 text-center text-[var(--muted)]">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="1" />
                    <circle cx="8.5" cy="9.5" r="1.5" />
                    <path d="m4 17 5-5 4 4 2-2 5 5" />
                  </svg>
                  <span className="font-body text-xs font-light">Sin foto</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="product-image"
              name="imagen"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Foto del producto"
              onChange={handleFileChange}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-body mt-3 w-full border border-[var(--ash)] px-3 py-2 text-xs uppercase tracking-[0.1em] text-[var(--cacao)] transition-colors hover:border-[var(--cacao)] hover:bg-[var(--cacao)] hover:text-[var(--paper)]"
            >
              {preview ? "Cambiar foto" : "Elegir foto"}
            </button>
            {preview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="font-body mt-2 w-full py-1 text-xs text-[var(--muted)] underline decoration-[var(--ash)] underline-offset-4 transition-colors hover:text-[var(--cacao)]"
              >
                Quitar foto
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Nombre *
              </span>
              <input
                id="product-nombre"
                name="nombre"
                type="text"
                required
                maxLength={120}
                aria-label="Nombre"
                value={form.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
                placeholder="Lavender & Vanilla"
                className={fieldClass()}
              />
            </label>

            <label className="mt-4 block">
              <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Notas olfativas
              </span>
              <textarea
                id="product-notas"
                name="notas"
                rows={2}
                maxLength={500}
                aria-label="Notas olfativas"
                value={form.notas}
                onChange={(event) => updateField("notas", event.target.value)}
                placeholder="Lavanda, vainilla de Tahití, haba tonka"
                className={`${fieldClass()} resize-none`}
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Precio (USD) *
                </span>
                <input
                  id="product-precio"
                  name="precio"
                  type="number"
                  required
                  min="0"
                  max="1000000"
                  step="0.01"
                  inputMode="decimal"
                  aria-label="Precio en dólares"
                  value={form.precio}
                  onChange={(event) => updateField("precio", event.target.value)}
                  placeholder="28.00"
                  className={fieldClass()}
                />
              </label>

              <label className="block">
                <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Peso y duración
                </span>
                <input
                  id="product-peso"
                  name="peso"
                  type="text"
                  maxLength={80}
                  aria-label="Peso y duración"
                  value={form.peso}
                  onChange={(event) => updateField("peso", event.target.value)}
                  placeholder="220 g · 40 h"
                  className={fieldClass()}
                />
              </label>
            </div>

            <p className="font-body mt-4 text-[11px] font-light leading-relaxed text-[var(--muted)]">
              Si no subes una foto, la tarjeta usa una ilustración con los colores de abajo.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Color del vaso
                </span>
                <div className="mt-2 flex items-center gap-2 border border-[var(--ash)] bg-[var(--paper)] px-2 py-1.5">
                  <input
                    type="color"
                    name="vaso"
                    value={form.vaso}
                    onChange={(event) => updateField("vaso", event.target.value)}
                    className="h-8 w-9 cursor-pointer border-0 bg-transparent p-0"
                    aria-label="Color del vaso"
                  />
                  <span className="font-body text-xs text-[var(--muted)]">{form.vaso}</span>
                </div>
              </label>

              <label className="block">
                <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Color de la cera
                </span>
                <div className="mt-2 flex items-center gap-2 border border-[var(--ash)] bg-[var(--paper)] px-2 py-1.5">
                  <input
                    type="color"
                    name="cera"
                    value={form.cera}
                    onChange={(event) => updateField("cera", event.target.value)}
                    className="h-8 w-9 cursor-pointer border-0 bg-transparent p-0"
                    aria-label="Color de la cera"
                  />
                  <span className="font-body text-xs text-[var(--muted)]">{form.cera}</span>
                </div>
              </label>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 border border-[var(--ash)] bg-[var(--paper)] px-4 py-3">
              <input
                type="checkbox"
                name="activo"
                aria-label="Visible en la tienda"
                checked={form.activo}
                onChange={(event) => updateField("activo", event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--amber)]"
              />
              <span>
                <span className="font-body block text-sm text-[var(--cacao)]">Visible en la tienda</span>
                <span className="font-body mt-0.5 block text-xs font-light text-[var(--muted)]">
                  Desmárcalo para guardarlo como borrador.
                </span>
              </span>
            </label>

            <p className="font-body mt-3 text-[11px] font-light text-[var(--muted)]">
              Foto recomendada: vertical, JPG/PNG/WebP, máximo 5 MB.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[var(--ash)] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="font-body border border-[var(--ash)] px-5 py-2.5 text-sm text-[var(--cacao)] transition-colors hover:border-[var(--cacao)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="font-body border border-[var(--cacao)] bg-[var(--cacao)] px-6 py-2.5 text-sm text-[var(--paper)] transition-colors hover:bg-transparent hover:text-[var(--cacao)] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Guardando…" : product ? "Guardar cambios" : "Publicar producto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
