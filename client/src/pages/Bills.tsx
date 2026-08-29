import { useCallback, useEffect, useState } from "react";
import { api, money } from "../api";
import { useAuth } from "../auth";

interface Split {
  membershipId: string;
  splitType: string;
  splitValue: number;
  membership: { user: { displayName: string } };
}
interface Bill {
  id: string;
  name: string;
  amount: number;
  recurrence: string;
  dueDay: number | null;
  category: string;
  splits: Split[];
}
interface Member {
  id: string;
  user: { displayName: string };
}

export default function Bills() {
  const { household } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!household) return;
    try {
      const [b, m] = await Promise.all([
        api<Bill[]>(`/households/${household.id}/bills`),
        api<Member[]>(`/households/${household.id}/members`),
      ]);
      setBills(b);
      setMembers(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills");
    }
  }, [household]);

  useEffect(() => {
    load();
  }, [load]);

  async function archive(id: string) {
    await api(`/households/bills/${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Bills</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-warm-500 hover:bg-warm-700 text-white text-sm rounded-lg px-4 py-2"
        >
          {showForm ? "Close" : "Add Bill"}
        </button>
      </div>

      {showForm && (
        <AddBillForm
          members={members}
          householdId={household!.id}
          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
          No bills yet. Add rent, utilities, or internet to start tracking.
        </div>
      ) : (
        <ul className="space-y-4">
          {bills.map((bill) => (
            <li key={bill.id} className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{bill.name}</h3>
                  <p className="text-sm text-stone-500">
                    {money(bill.amount)} · {bill.recurrence === "monthly" ? `Monthly, day ${bill.dueDay}` : "One-time"} ·{" "}
                    {bill.category}
                  </p>
                </div>
                <button
                  onClick={() => archive(bill.id)}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Archive
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {bill.splits.map((s) => (
                  <span key={s.membershipId} className="bg-warm-100 text-warm-700 rounded-full px-2.5 py-1">
                    {s.membership.user.displayName}:{" "}
                    {s.splitType === "percentage" ? `${s.splitValue}%` : money(s.splitValue)}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddBillForm({
  members,
  householdId,
  onDone,
}: {
  members: Member[];
  householdId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState("rent");
  const [equal, setEqual] = useState(true);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pctSum = members.reduce((s, m) => s + (Number(custom[m.id]) || 0), 0);
  const invalidCustom = !equal && Math.abs(pctSum - 100) > 0.01;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalidCustom) {
      setError(`Percentages must sum to 100% (currently ${pctSum}%)`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const amt = Number(amount);
      const per = +(100 / members.length).toFixed(4);
      const splits = members.map((m) => ({
        membershipId: m.id,
        splitType: "percentage",
        splitValue: equal ? per : Number(custom[m.id]) || 0,
      }));
      await api(`/households/${householdId}/bills`, {
        method: "POST",
        body: JSON.stringify({
          name,
          amount: amt,
          recurrence,
          dueDay: recurrence === "monthly" ? Number(dueDay) : null,
          category,
          splits,
        }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bill");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-500";

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
      <h2 className="font-medium">New bill</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Name (e.g. Rent)" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={input} type="number" step="0.01" min="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <select className={input} value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
          <option value="monthly">Monthly</option>
          <option value="one_time">One-time</option>
        </select>
        {recurrence === "monthly" && (
          <input className={input} type="number" min="1" max="31" placeholder="Due day" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        )}
        <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="rent">Rent</option>
          <option value="utility">Utility</option>
          <option value="internet">Internet</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={equal} onChange={() => setEqual(true)} /> Equal split
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={!equal} onChange={() => setEqual(false)} /> Custom %
        </label>
      </div>

      {!equal && (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              <span className="w-28 truncate">{m.user.displayName}</span>
              <input
                className="border border-stone-300 rounded-lg px-2 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-warm-500"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={custom[m.id] ?? ""}
                onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })}
              />
              %
            </div>
          ))}
          <p className={`text-xs ${invalidCustom ? "text-red-600" : "text-green-700"}`}>
            Sum: {pctSum}% {invalidCustom ? "— must equal 100%" : "✓"}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        className="w-full bg-warm-500 hover:bg-warm-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
        disabled={busy || invalidCustom}
      >
        Add bill
      </button>
    </form>
  );
}

