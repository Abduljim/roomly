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
  payer: { user: { displayName: string } };
  payee: { user: { displayName: string } };
  billCycle: { bill: { name: string } };
}
interface Member {
  id: string;
  user: { displayName: string };
}

const statusColors: Record<string, string> = {
  pending: "bg-stone-100 text-stone-500",
  sent: "bg-blue-50 text-blue-600",
  confirmed: "bg-green-50 text-green-700",
  disputed: "bg-red-50 text-red-600",
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

  const input =
    "border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-500";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payment history</h1>

      <div className="flex flex-wrap gap-2">
        <input className={input} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select className={input} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">All members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.user.displayName}
            </option>
          ))}
        </select>
        <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="confirmed">Confirmed</option>
          <option value="disputed">Disputed</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
          No payments match these filters.
        </div>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id} className="bg-white rounded-xl border border-stone-200">
              <button
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-2"
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                <span className="text-sm">
                  <strong>{p.payer.user.displayName}</strong> → <strong>{p.payee.user.displayName}</strong>
                  <span className="text-stone-400"> · {p.billCycle.bill.name}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium">{money(p.amount)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status] ?? ""}`}>
                    {p.status}
                  </span>
                </span>
              </button>
              {expanded === p.id && (
                <div className="px-4 pb-4 text-xs text-stone-500 space-y-1 border-t border-stone-100 pt-3">
                  <p>Month: {p.settlementMonth.slice(0, 7)}</p>
                  <p>Created: {new Date(p.createdAt).toLocaleString()}</p>
                  {p.sentAt && <p>Marked sent: {new Date(p.sentAt).toLocaleString()}</p>}
                  {p.confirmedAt && <p>Confirmed: {new Date(p.confirmedAt).toLocaleString()}</p>}
                  {p.note && <p className="text-stone-700">Note: {p.note}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
