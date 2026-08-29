import { useCallback, useEffect, useState } from "react";
import { api, money } from "../api";
import { useAuth } from "../auth";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  note: string | null;
  sentAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  settlementMonth: string;
  payerName: string;
  payeeName: string;
  billName: string;
}
interface Member {
  id: string;
  user: { displayName: string };
}

const statusStyles: Record<string, { chip: string; dot: string }> = {
  pending: { chip: "chip bg-ink/5 text-ink/60", dot: "bg-ink/40" },
  sent: { chip: "chip bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  confirmed: { chip: "chip bg-cash-100 text-cash-600", dot: "bg-cash-600" },
  disputed: { chip: "chip bg-red-50 text-red-600", dot: "bg-red-500" },
};

export default function History() {
  const { household } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [month, setMonth] = useState("");
  const [memberId, setMemberId] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!household) return;
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (memberId) params.set("memberId", memberId);
      if (status) params.set("status", status);
      setPayments(await api<PaymentRecord[]>(`/households/${household.id}/payments?${params}`));
      setMembers(await api<Member[]>(`/households/${household.id}/members`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    }
  }, [household, month, memberId, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Ledger</p>
        <h1 className="font-display font-bold text-2xl tracking-tight">Payment history</h1>
      </div>

      {/* Filters */}
      <div className="card p-3.5 space-y-2.5 stagger">
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        <select className="field" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">All members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.user.displayName}
            </option>
          ))}
        </select>
        {(month || memberId || status) && (
          <button
            className="text-xs text-brand-600 font-medium hover:underline"
            onClick={() => {
              setMonth("");
              setMemberId("");
              setStatus("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {payments.length === 0 ? (
        <div className="card p-10 text-center text-ink/45 text-sm wiggle">
          <div className="text-3xl mb-2">🗂️</div>
          No payments match these filters.
        </div>
      ) : (
        <ul className="space-y-2.5 stagger">
          {payments.map((p) => {
            const st = statusStyles[p.status] ?? statusStyles.pending;
            const isOpen = expanded === p.id;
            return (
              <li key={p.id} className="card overflow-hidden card-hover">
                <button
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <span className="text-sm min-w-0">
                      <span className="font-semibold">{p.payerName}</span>
                      <span className="text-ink/40"> → </span>
                      <span className="font-semibold">{p.payeeName}</span>
                      <span className="text-ink/40 hidden sm:inline"> · {p.billName}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2.5 shrink-0">
                    <span className="font-display font-bold text-ink">{money(p.amount)}</span>
                    <span className={st.chip}>{p.status}</span>
                    <Chevron up={isOpen} />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-ink/55 space-y-1 border-t border-ink/5 pt-3 overflow-hidden page-enter">
                    <Row k="Bill" v={p.billName || "—"} />
                    <Row k="Month" v={p.settlementMonth.slice(0, 7)} />
                    <Row k="Created" v={fmt(p.createdAt)} />
                    {p.sentAt && <Row k="Marked sent" v={fmt(p.sentAt)} />}
                    {p.confirmedAt && <Row k="Confirmed" v={fmt(p.confirmedAt)} />}
                    {p.note && <Row k="Note" v={p.note} strong />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <p className="flex justify-between gap-4">
      <span className="text-ink/40 shrink-0">{k}</span>
      <span className={`text-right ${strong ? "text-ink font-semibold" : "text-ink/80"}`}>{v}</span>
    </p>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-ink/35 transition-transform duration-300 ${up ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
