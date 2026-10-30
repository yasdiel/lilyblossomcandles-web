const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const API_ORIGIN = /^https?:\/\//i.test(API_BASE) ? new URL(API_BASE).origin : "";
const AUTH_TOKEN_KEY = "lily_admin_access_token";

function readAuthToken() {
  try {
    return window.sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

let authToken = readAuthToken();

function setAuthToken(token) {
  authToken = typeof token === "string" ? token : "";
  try {
    if (authToken) {
      window.sessionStorage.setItem(AUTH_TOKEN_KEY, authToken);
    } else {
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Algunos navegadores bloquean sessionStorage; la cookie sigue disponible.
  }
}

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function extractMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    return data.detail
      .map((item) => item?.msg || String(item))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof data.message === "string") return data.message;
  return fallback;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = {};
  let payload;

  if (authToken && path.startsWith("/admin/")) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: payload,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Comprueba que el backend esté encendido.",
      0,
    );
  }

  let data = null;
  if (response.status !== 204) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => null);
    }
  }

  if (!response.ok) {
    if (response.status === 401) setAuthToken("");
    throw new ApiError(
      extractMessage(data, "Ocurrió un error inesperado."),
      response.status,
      data,
    );
  }

  return data;
}

export const api = {
  products: {
    list: () => request("/products"),
  },
  events: {
    list: () => request("/events"),
  },
  admin: {
    me: () => request("/admin/me"),
    login: async (email, password) => {
      const result = await request("/admin/login", {
        method: "POST",
        body: { email, password },
      });
      setAuthToken(result?.access_token || "");
      return result;
    },
    logout: async () => {
      try {
        return await request("/admin/logout", { method: "POST" });
      } finally {
        setAuthToken("");
      }
    },
    products: () => request("/admin/products"),
    createProduct: (formData) =>
      request("/admin/products", { method: "POST", body: formData }),
    updateProduct: (id, formData) =>
      request(`/admin/products/${id}`, { method: "PUT", body: formData }),
    deleteProduct: (id) =>
      request(`/admin/products/${id}`, { method: "DELETE" }),
    events: () => request("/admin/events"),
    createEvent: (formData) =>
      request("/admin/events", { method: "POST", body: formData }),
    updateEvent: (id, formData) =>
      request(`/admin/events/${id}`, { method: "PUT", body: formData }),
    deleteEvent: (id) =>
      request(`/admin/events/${id}`, { method: "DELETE" }),
    changePassword: async (currentPassword, newPassword) => {
      const result = await request("/admin/change-password", {
        method: "POST",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      setAuthToken(result?.access_token || "");
      return result;
    },
  },
};

export function assetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  if (path.startsWith("/")) {
    return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
  }
  return path;
}
