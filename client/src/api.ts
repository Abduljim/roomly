import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// Web: call the API through the same-origin Vercel rewrite (/api -> Render), so
// cookies stay same-site and auth works in every browser. Native (Capacitor): no
// proxy exists, so the host is provided at build time via VITE_API_URL.
const BASE = isNative
  ? (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api"
  : "/api";

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
