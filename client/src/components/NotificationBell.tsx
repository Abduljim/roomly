import { useCallback, useEffect, useRef, useState } from "react";
import { api, money } from "../api";

interface Notification {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

interface NotifResponse {
  notifications: Notification[];
  unread: number;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotifResponse | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<NotifResponse>("/notifications"));
    } catch {
      /* not critical */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    load();
  }

  const unread = data?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && !data) load();
        }}
        className="relative w-9 h-9 grid place-items-center rounded-xl text-ink/55 hover:bg-ink/5 transition-colors"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 pulse-ring" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-nav ring-1 ring-ink/10 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-ink/5 flex items-center justify-between">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <span className="chip bg-brand-500 text-white">{unread} new</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!data ? (
              <p className="p-4 text-sm text-ink/40 text-center">Loading…</p>
            ) : data.notifications.length === 0 ? (
              <p className="p-4 text-sm text-ink/40 text-center">You're all caught up 🎉</p>
            ) : (
              data.notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-ink/5 flex gap-2.5 items-start transition-colors ${
                    n.read ? "opacity-55" : "hover:bg-canvas/50"
                  }`}
                >
                  <NotifIcon type={n.type} />
                  <div className="text-sm">
                    <NotifText n={n} />
                    <p className="text-[11px] text-ink/40 mt-0.5">
                      {timeAgo(n.createdAt)}
                      {!n.read && <span className="ml-1 text-brand-600 font-semibold">· new</span>}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifIcon({ type }: { type: string }) {
  const c = type === "dispute" ? "#dc2626" : type === "payment_confirmed" ? "#5e7c4c" : "#b07d4f";
  return (
    <span className="w-7 h-7 shrink-0 rounded-lg grid place-items-center bg-canvas ring-1 ring-ink/5" style={{ color: c }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" opacity="0.9" />
        {type === "dispute" ? <path d="M12 8v5M12 16h.01" /> : <path d="M12 7v6M12 17h.01" />}
      </svg>
    </span>
  );
}

function NotifText({ n }: { n: Notification }) {
  const p = n.payload ?? {};
  const from = (p.from as string) || (p.displayName as string) || "someone";
  switch (n.type) {
    case "payment_created":
      return (
        <p className="text-ink/75">
          <strong>{from}</strong> should pay you <strong>{money(Number(p.amount) || 0)}</strong>
        </p>
      );
    case "payment_confirmed":
      return <p className="text-ink/75"><strong>{from}</strong> confirmed a payment</p>;
    case "dispute":
      return <p className="text-ink/75">A payment with <strong>{from}</strong> was disputed</p>;
    case "reminder":
      return <p className="text-ink/75">Reminder: <strong>{money(Number(p.amount) || 0)}</strong> to {from}</p>;
    default:
      return <p className="text-ink/75">{(p.message as string) || "New update"}</p>;
  }
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
