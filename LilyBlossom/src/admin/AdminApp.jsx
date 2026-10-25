import { useCallback, useEffect, useState } from "react";
import { THEME } from "../theme";
import { api } from "../lib/api";
import LoginScreen from "./LoginScreen";
import Dashboard from "./Dashboard";

export default function AdminApp() {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Panel · Lily Blossom Candles";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    let active = true;

    api.admin
      .me()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (active) setStatus("anonymous");
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (email, password) => {
    const result = await api.admin.login(email, password);
    setUser(result.user);
    setStatus("authenticated");
  };

  const handleLogout = useCallback(async () => {
    try {
      await api.admin.logout();
    } catch {
      // Aunque la sesión ya haya expirado, cerramos el panel igualmente.
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  return (
    <div className="font-body min-h-screen bg-[var(--bone)] text-[var(--cacao)]">
      <style>{THEME}</style>

      <header className="border-b border-[var(--ash)] bg-[var(--bone)]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="Lily Blossom Candles - Ver tienda">
            <svg viewBox="0 0 24 32" className="h-7 w-5 shrink-0" aria-hidden="true">
              <path d="M12 2 C7 9 8 14 12 16 C16 14 17 9 12 2Z" fill="var(--amber)" />
              <rect x="6" y="18" width="12" height="12" rx="2" fill="none" stroke="var(--cacao)" strokeWidth="1.2" />
            </svg>
            <span className="font-display truncate text-xl tracking-wide sm:text-2xl">Lily Blossom</span>
            <span className="font-body hidden border border-[var(--ash)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] sm:inline">
              Admin
            </span>
          </a>

          {status === "authenticated" && user && (
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <a
                href="/"
                className="font-body hidden text-xs uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--cacao)] sm:inline"
              >
                Ver tienda
              </a>
              <span className="hidden max-w-56 truncate font-light text-[var(--muted)] lg:block">
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="border border-[var(--ash)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--cacao)] transition-colors hover:border-[var(--cacao)] hover:bg-[var(--cacao)] hover:text-[var(--paper)]"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      {status === "loading" ? (
        <main className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 text-[var(--muted)]">
            <span className="h-8 w-8 animate-spin rounded-full border border-[var(--ash)] border-t-[var(--amber)]" />
            <p className="text-sm font-light">Comprobando tu sesión…</p>
          </div>
        </main>
      ) : status === "authenticated" && user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </div>
  );
}
