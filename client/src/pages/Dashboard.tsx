import { useCallback, useEffect, useState } from "react";
import { api, money } from "../api";
import { useAuth } from "../auth";
import PaymentActions from "../components/PaymentActions";

interface Settlement {
  month: string;
  simplified: { from: string; to: string; amount: number }[];
  memberBalances: { membershipId: string; displayName: string; owed: number; owes: number; net: number }[];
  payments: {
    id: string;
    amount: number;
    status: string;
    note: string | null;
    payerMembershipId: string;
    payeeMembershipId: string;
    payerName: string;
    payeeName: string;
  }[];
}

interface Member {
  id: string;
  user: { displayName: string };
}

export default function Dashboard() {
  const { household } = useAuth();
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!household) return;
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [s, m] = await Promise.all([
        api<Settlement>(`/households/${household.id}/settlement/${month}`),
        api<Member[]>(`/households/${household.id}/members`),
      ]);
      setSettlement(s);
      setMembers(m);
      if (s.payments.length === 0) {
        await api(`/households/${household.id}/settlement/generate`, { method: "POST" }).catch(() => {});
        setSettlement(await api<Settlement>(`/households/${household.id}/settlement/${month}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [household]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!settlement) return <p className="text-stone-400 text-sm">Loading settlement…</p>;

  const me = members.find((m) => m.user.displayName);
  const myBalance = settlement.memberBalances.find((b) => me && b.membershipId === me.id);
  const nameOf = (mid: string) =>
    members.find((m) => m.id === mid)?.user.displayName ?? "Former member";

  const actionable = settlement.payments.filter((p) => p.status === "pending" || p.status === "sent");
  const activity = settlement.payments.slice(-10).reverse();

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500">You owe</p>
          <p className={`text-2xl font-semibold ${myBalance && myBalance.owes > 0 ? "text-red-600" : "text-stone-400"}`}>
            {money(myBalance?.owes ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-sm text-stone-500">You're owed</p>
          <p className={`text-2xl font-semibold ${myBalance && myBalance.owed > 0 ? "text-green-700" : "text-stone-400"}`}>
            {money(myBalance?.owed ?? 0)}
          </p>
        </div>
      </div>

      {/* Who owes whom (simplified) */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5">
        <h2 className="font-medium mb-3">This month's settlement</h2>
        {settlement.simplified.length === 0 ? (
          <p className="text-sm text-stone-400">No bills to settle yet — add one on the Bills page.</p>
        ) : (
          <ul className="space-y-2">
            {settlement.simplified.map((d, i) => (
              <li key={i} className="text-sm flex justify-between items-center">
                <span>
                  <strong>{nameOf(d.from)}</strong> owes <strong>{nameOf(d.to)}</strong>
                </span>
                <span className="font-medium text-red-600">{money(d.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending payments requiring action */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5">
        <h2 className="font-medium mb-3">Needs action</h2>
        {actionable.length === 0 ? (
          <p className="text-sm text-stone-400">All settled — nothing pending. 🎉</p>
        ) : (
          <ul className="space-y-4">
            {actionable.map((p) => (
              <li key={p.id} className="border border-stone-100 rounded-xl p-4 space-y-2">
                <div className="text-sm">
                  <strong>{p.payerName}</strong> → <strong>{p.payeeName}</strong>{" "}
                  <span className="font-medium">{money(p.amount)}</span>{" "}
                  <span
                    className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                      p.status === "pending" ? "bg-stone-100 text-stone-500" : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <PaymentActions payment={p} onChanged={load} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5">
        <h2 className="font-medium mb-3">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing yet.</p>
        ) : (
          <ul className="text-sm space-y-1.5 text-stone-600">
            {activity.map((p) => (
              <li key={p.id}>
                {p.payerName} → {p.payeeName}: {money(p.amount)} — <em>{p.status}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
