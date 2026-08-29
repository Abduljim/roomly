import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// In a native (Capacitor) app the origin is the WebView, so `./api` isn't reachable
// relative to the app — we must point at the deployed backend via VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  (isNative && typeof window !== "undefined"
    ? (window as unknown as { __roomly_api?: string }).__roomly_api
    : "") ||
  "/api";

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
