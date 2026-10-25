import { useState } from "react";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onLogin(email.trim(), password);
    } catch (loginError) {
      setError(loginError.message || "No se pudo iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[var(--amber)]">
            Panel privado
          </p>
          <h1 className="font-display mt-3 text-4xl text-[var(--cacao)]">La colección de Lily</h1>
          <p className="font-body mx-auto mt-3 max-w-sm text-sm font-light leading-relaxed text-[var(--muted)]">
            Entra para publicar nuevas velas, actualizar precios y cambiar las fotos de tu tienda.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-[var(--ash)] bg-[var(--paper)] p-6 shadow-[0_18px_50px_-30px_rgba(74,53,42,0.55)] sm:p-8"
        >
          {error && (
            <div
              role="alert"
              className="mb-5 border border-[#A64B3C]/40 bg-[#A64B3C]/10 px-4 py-3 text-sm text-[#7E3529]"
            >
              {error}
            </div>
          )}

          <label className="block">
            <span className="font-body text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Correo
            </span>
            <input
              id="admin-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              aria-label="Correo"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className="font-body mt-2 w-full border border-[var(--ash)] bg-[var(--bone)] px-4 py-3 text-[var(--cacao)] outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--cacao)]"
            />
          </label>

          <label className="mt-5 block">
            <span className="font-body text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Contraseña
            </span>
            <div className="relative mt-2">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                aria-label="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••"
                className="font-body w-full border border-[var(--ash)] bg-[var(--bone)] px-4 py-3 pr-24 text-[var(--cacao)] outline-none transition-colors placeholder:text-[var(--muted)]/60 focus:border-[var(--cacao)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="font-body absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wide text-[var(--muted)] transition-colors hover:text-[var(--cacao)]"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="font-body mt-7 w-full border border-[var(--cacao)] bg-[var(--cacao)] px-5 py-3.5 text-sm tracking-wide text-[var(--paper)] transition-all duration-300 hover:bg-transparent hover:text-[var(--cacao)] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar al panel"}
          </button>

          <p className="font-body mt-5 text-center text-xs font-light text-[var(--muted)]">
            <a href="/" className="underline decoration-[var(--ash)] underline-offset-4 transition-colors hover:text-[var(--cacao)]">
              Volver a la tienda
            </a>
          </p>
        </form>

        <p className="font-body mt-6 text-center text-[11px] font-light uppercase tracking-[0.18em] text-[var(--muted)]">
          Lily Blossom Candles
        </p>
      </div>
    </main>
  );
}
