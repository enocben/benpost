import { clearSession, getToken } from "./auth";

export const API_BASE =
  (import.meta as any).env?.API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractMessage(parsed: unknown, status: number): string {
  if (typeof parsed === "string" && parsed.trim().length > 0) return parsed;
  if (parsed && typeof parsed === "object") {
    const anyParsed = parsed as Record<string, unknown>;
    if (typeof anyParsed.message === "string") return anyParsed.message;
    if (typeof anyParsed.summary === "string") return anyParsed.summary;
  }
  return `Erreur ${status}`;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.replace("/login");
    }
    throw new ApiError("Session expirée, merci de vous reconnecter.", 401);
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new ApiError(extractMessage(parsed, res.status), res.status);
  }

  // L'API enveloppe ses réponses dans { success, message, data }
  if (parsed && typeof parsed === "object" && "success" in (parsed as object)) {
    const envelope = parsed as { success: boolean; message: string; data: T };
    if (!envelope.success) {
      throw new ApiError(envelope.message || "Erreur inattendue", res.status);
    }
    return envelope.data;
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
