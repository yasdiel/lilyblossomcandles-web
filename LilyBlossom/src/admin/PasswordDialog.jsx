import { useState } from "react";
import { api } from "../lib/api";
import Modal from "./Modal";

const inputClass =
  "font-body mt-2 w-full border border-[var(--ash)] bg-[var(--paper)] px-3.5 py-2.5 text-sm text-[var(--cacao)] outline-none transition-colors focus:border-[var(--cacao)]";

export default function PasswordDialog({ onClose, onSaved }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 10) {
      setError("La nueva contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Las dos contraseñas nuevas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const result = await api.admin.changePassword(currentPassword, newPassword);
      setSaving(false);
      onSaved(result?.message || "Contraseña actualizada correctamente.");
    } catch (saveError) {
      setError(saveError.message || "No se pudo cambiar la contraseña.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Cambiar contraseña"
      description="Usa al menos 10 caracteres y no compartas la clave."
      onClose={onClose}
      busy={saving}
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

        <label className="block">
          <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Contraseña actual
          </span>
          <input
            id="current-password"
            name="current-password"
            type="password"
            required
            autoComplete="current-password"
            aria-label="Contraseña actual"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mt-4 block">
          <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Nueva contraseña
          </span>
          <input
            id="new-password"
            name="new-password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            aria-label="Nueva contraseña"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mt-4 block">
          <span className="font-body text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Repite la nueva contraseña
          </span>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            aria-label="Repite la nueva contraseña"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={inputClass}
          />
        </label>

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
            {saving ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
