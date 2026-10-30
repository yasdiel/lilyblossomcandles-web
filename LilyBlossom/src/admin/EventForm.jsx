import { useEffect, useRef, useState } from "react";
import { api, assetUrl } from "../lib/api";
import Modal from "./Modal";

const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  activo: true,
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function fieldClass() {
  return "font-body mt-2 w-full border border-[var(--ash)] bg-[var(--paper)] px-3.5 py-2.5 text-sm text-[var(--cacao)] outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--cacao)]";
}

export default function EventForm({ event, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    event
      ? {
          nombre: event.nombre,
          descripcion: event.descripcion,
          activo: Boolean(event.activo),
        }
      : EMPTY_FORM,
  );
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(() => assetUrl(event?.imagen_url));
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

  const handleFileChange = (selectedEvent) => {
    const selected = selectedEvent.target.files?.[0];
    selectedEvent.target.value = "";
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
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setError("");

    const nombre = form.nombre.trim();
    if (!nombre) {
      setError("Escribe el nombre del producto para eventos.");
      return;
    }
    if (!preview && !file) {
      setError("Sube una foto para el producto para eventos.");
      return;
    }

    const data = new FormData();
    data.append("nombre", nombre);
    data.append("descripcion", form.descripcion.trim());
    data.append("activo", form.activo ? "true" : "false");
    if (file) data.append("imagen", file);

    setSaving(true);
    try {
      const saved = event
        ? await api.admin.updateEvent(event.id, data)
        : await api.admin.createEvent(data);
      setSaving(false);
      onSaved(saved, !event);
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar el producto para eventos.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={event ? "Editar producto para eventos" : "Nuevo producto para eventos"}
      description={
        event
          ? "Cambia la foto o los detalles y guarda los cambios."
          : "Sube una foto y añade los detalles que verán tus clientes."
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
          <div className="sm:w-44">
            <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Foto *
            </span>
            <div className="mt-2 aspect-[4/5] w-full overflow-hidden border border-[var(--ash)] bg-[var(--paper)] sm:w-44">
              {preview ? (
                <img
                  src={preview}
                  alt="Vista previa del producto para eventos"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-44 w-full flex-col items-center justify-center gap-2 px-3 text-center text-[var(--muted)]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="18" height="16" rx="1" />
                    <circle cx="8.5" cy="9.5" r="1.5" />
                    <path d="m4 17 5-5 4 4 2-2 5 5" />
                  </svg>
                  <span className="font-body text-xs font-light">Foto del evento</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              id="event-image"
              name="imagen"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Foto del producto para eventos"
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
            <p className="font-body mt-2 text-[11px] font-light leading-relaxed text-[var(--muted)]">
              JPG, PNG o WebP · máximo 5 MB.
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Nombre *
              </span>
              <input
                id="event-nombre"
                name="nombre"
                type="text"
                required
                maxLength={120}
                aria-label="Nombre del producto para eventos"
                value={form.nombre}
                onChange={(inputEvent) =>
                  updateField("nombre", inputEvent.target.value)
                }
                placeholder="Wedding table"
                className={fieldClass()}
              />
            </label>

            <label className="mt-4 block">
              <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Descripción
              </span>
              <textarea
                id="event-descripcion"
                name="descripcion"
                rows={5}
                maxLength={600}
                aria-label="Descripción del producto para eventos"
                value={form.descripcion}
                onChange={(inputEvent) =>
                  updateField("descripcion", inputEvent.target.value)
                }
                placeholder="Candles in soft neutral tones for a wedding reception."
                className={`${fieldClass()} resize-none`}
              />
            </label>

            <label className="mt-4 flex cursor-pointer items-start gap-3 border border-[var(--ash)] bg-[var(--paper)] px-4 py-3">
              <input
                type="checkbox"
                name="activo"
                aria-label="Visible en la tienda"
                checked={form.activo}
                onChange={(inputEvent) =>
                  updateField("activo", inputEvent.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-[var(--amber)]"
              />
              <span>
                <span className="font-body block text-sm text-[var(--cacao)]">
                  Visible en la tienda
                </span>
                <span className="font-body mt-0.5 block text-xs font-light text-[var(--muted)]">
                  Desmárcalo para guardarlo como borrador.
                </span>
              </span>
            </label>

            <p className="font-body mt-3 text-[11px] font-light leading-relaxed text-[var(--muted)]">
              La foto y la descripción aparecen en la sección de eventos,
              debajo de la colección.
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
            {saving
              ? "Guardando…"
              : event
                ? "Guardar cambios"
                : "Publicar evento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
