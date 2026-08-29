import { useCallback, useEffect, useState, FormEvent } from "react";
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
export interface Member {
  id: string;
  user: { displayName: string };
}

const CATEGORIES = [
  { id: "rent", label: "Rent", icon: HomeIcon },
  { id: "utility", label: "Utilities", icon: BoltIcon },
  { id: "internet", label: "Internet", icon: WifiIcon },
  { id: "groceries", label: "Groceries", icon: BasketIcon },
  { id: "other", label: "Other", icon: DotsIcon },
];

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Recurring</p>
          <h1 className="font-display font-bold text-2xl tracking-tight">Bills</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "btn-ghost" : "btn-primary"}
        >
          {showForm ? "Close" : "＋ Add bill"}
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
        <div className="card p-10 text-center text-ink/45 text-sm wiggle">
          <div className="text-3xl mb-2">🧾</div>
          No bills yet. Add rent, utilities, or groceries to start tracking.
        </div>
      ) : (
        <ul className="space-y-3 stagger">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} onArchive={() => archive(bill.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BillCard({ bill, onArchive }: { bill: Bill; onArchive: () => void }) {
  const cat = CATEGORIES.find((c) => c.id === bill.category) ?? CATEGORIES[4];
  return (
    <li className="card p-5 card-hover group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand-100 text-brand-700 grid place-items-center">
            <cat.icon />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{bill.name}</h3>
            <p className="text-xs text-ink/45 mt-0.5">
              {bill.recurrence === "monthly"
                ? bill.dueDay
                  ? `Monthly · due the ${ordinal(bill.dueDay)}`
                  : "Monthly"
                : "One-time"}
              {" · "}
              {cat.label}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display font-bold text-xl tracking-tight">{money(bill.amount)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {bill.splits.map((s) => (
            <span key={s.membershipId} className="chip bg-canvas/80 text-ink/65 ring-1 ring-ink/5">
              {s.membership.user.displayName.split(" ")[0]}:{" "}
              {s.splitType === "percentage" ? `${s.splitValue}%` : money(s.splitValue)}
            </span>
          ))}
        </div>
        <button
          onClick={onArchive}
          className="text-xs text-ink/35 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
          title="Archive bill"
        >
          Archive
        </button>
      </div>
    </li>
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
  const [recurrence, setRecurrence] = useState<"monthly" | "one_time">("monthly");
  const [dueDay, setDueDay] = useState("1");
  const [category, setCategory] = useState("rent");
  const [equal, setEqual] = useState(true);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pctSum = members.reduce((s, m) => s + (Number(custom[m.id]) || 0), 0);
  const invalidCustom = !equal && Math.abs(pctSum - 100) > 0.01;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (invalidCustom) {
      setError(`Percentages must sum to 100% (currently ${pctSum}%)`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const amt = Number(amount);
      const per = +(100 / Math.max(members.length, 1)).toFixed(4);
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
          dueDay: recurrence === "monthly" ? (Number(dueDay) || null) : null,
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

  return (
    <form onSubmit={submit} className="card p-6 stagger overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">New bill</h2>
        <span className="text-xs font-mono text-ink/35">{members.length} housemates</span>
      </div>

      {/* Step 1: what + how much */}
      <div className="grid grid-cols-5 gap-2">
        <input
          className="field col-span-3"
          placeholder="Name (e.g. Rent)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="col-span-2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 font-medium">$</span>
          <input
            className="field pl-7"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`btn text-xs px-3 py-2 ${
              category === c.id
                ? "btn-primary"
                : "bg-white/70 ring-1 ring-ink/10 text-ink/60 hover:text-ink"
            }`}
          >
            <c.icon /> {c.label}
          </button>
        ))}
      </div>

      {/* Recurrence */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {(["monthly", "one_time"] as const).map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRecurrence(r)}
            className={`rounded-2xl px-3 py-2.5 font-medium transition-all ${
              recurrence === r ? "bg-ink text-white shadow" : "bg-white/70 ring-1 ring-ink/10 text-ink/60"
            }`}
          >
            {r === "monthly" ? "Monthly" : "One-time"}
          </button>
        ))}
      </div>
      {recurrence === "monthly" && (
        <div className="mt-3">
          <label className="field-label">Due day of month</label>
          <input
            className="field"
            type="number"
            min="1"
            max="31"
            placeholder="1"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </div>
      )}

      {/* Split */}
      <div className="mt-5">
        <label className="field-label">How to split</label>
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setEqual(true)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              equal ? "bg-brand-500 text-white shadow" : "bg-white/70 ring-1 ring-ink/10 text-ink/60"
            }`}
          >
            Equal split
          </button>
          <button
            type="button"
            onClick={() => setEqual(false)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              !equal ? "bg-brand-500 text-white shadow" : "bg-white/70 ring-1 ring-ink/10 text-ink/60"
            }`}
          >
            Custom %
          </button>
        </div>

        {!equal && (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className="w-24 truncate text-ink/60">{m.user.displayName}</span>
                <input
                  className="field py-2 flex-1"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={custom[m.id] ?? ""}
                  onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })}
                  placeholder="0"
                />
                <span className="text-ink/40 w-5">%</span>
              </div>
            ))}
            <p className={`text-xs font-medium ${invalidCustom ? "text-red-600" : "text-cash-600"}`}>
              Split total: {pctSum}% {invalidCustom ? "— must equal 100%" : "✓"}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-4">{error}</p>}
      <button type="submit" className="btn-primary w-full mt-5" disabled={busy || invalidCustom}>
        {busy ? "Adding…" : "Add bill"}
      </button>
    </form>
  );
}

/* helpers */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* category icons */
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}
function WifiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a15 15 0 0 1 20 0" />
      <path d="M5 12.5a10 10 0 0 1 14 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" />
    </svg>
  );
}
function BasketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10h14l-1.5 10h-11L5 10Z" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}
