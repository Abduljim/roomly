import { useCallback, useEffect, useState, ReactElement } from "react";
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

const statusChip: Record<string, string> = {
  pending: "chip bg-ink/5 text-ink/60",
  sent: "chip bg-blue-50 text-blue-600",
  confirmed: "chip bg-cash-100 text-cash-600",
  disputed: "chip bg-red-50 text-red-600",
};

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
  if (!settlement)
    return (
      <div className="space-y-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-40" />
        <div className="skeleton h-40" />
      </div>
    );

  const me = members.find((m) => m.user.displayName);
  const myBalance = settlement.memberBalances.find((b) => me && b.membershipId === me.id);
  const nameOf = (mid: string) =>
    members.find((m) => m.id === mid)?.user.displayName ?? "Former member";

  const actionable = settlement.payments.filter((p) => p.status === "pending" || p.status === "sent");
  const activity = settlement.payments.slice(-10).reverse();

  const monthLabel = new Date(settlement.month + "-01").toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Month header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {monthLabel}
          </p>
          <h1 className="font-display font-bold text-2xl tracking-tight mt-0.5">
            Hello, {me?.user.displayName.split(" ")[0]}
          </h1>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 stagger">
        <BalanceCard
          label="You owe"
          value={myBalance?.owes ?? 0}
          tone="red"
          icon={OweIcon}
        />
        <BalanceCard
          label="You're owed"
          value={myBalance?.owed ?? 0}
          tone="green"
          icon={OwedIcon}
        />
      </div>

      {/* Who-owes-whom flow visualization */}
      <SettlementFlow
        edges={settlement.simplified}
        nameOf={nameOf}
        empty={settlement.simplified.length === 0}
      />

      {/* Needs action */}
      <section className="card p-5 stagger">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Needs action</h2>
          {actionable.length > 0 && (
            <span className="chip bg-brand-500 text-white pulse-ring">{actionable.length}</span>
          )}
        </div>
        {actionable.length === 0 ? (
          <p className="text-sm text-ink/45 flex items-center gap-2">
            <span className="text-lg">🎉</span> All settled — nothing pending.
          </p>
        ) : (
          <ul className="space-y-3">
            {actionable.map((p) => (
              <li key={p.id} className="rounded-2xl bg-canvas/70 ring-1 ring-ink/5 p-4 space-y-2.5 hover:ring-brand/20 transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={p.payerName} />
                    <div className="text-sm leading-tight min-w-0">
                      <p className="truncate">
                        <strong>{p.payerName}</strong>→<strong>{p.payeeName}</strong>
                      </p>
                      <span className={statusChip[p.status] || "chip"}>{p.status}</span>
                    </div>
                  </div>
                  <span className="font-display font-bold text-lg text-ink whitespace-nowrap">
                    {money(p.amount)}
                  </span>
                </div>
                <PaymentActions payment={p} onChanged={load} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity */}
      <section className="card p-5 stagger">
        <h2 className="font-semibold mb-3">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-ink/45">Nothing yet — add a bill to get rolling.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {activity.map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink/70">
                  <strong className="text-ink font-semibold">{p.payerName}</strong> →{" "}
                  <strong className="text-ink font-semibold">{p.payeeName}</strong>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-medium">{money(p.amount)}</span>
                  <span className={statusChip[p.status] || "chip"}>{p.status}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BalanceCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "red" | "green";
  icon: (props: { tone: string }) => ReactElement;
}) {
  const active = value > 0;
  const color =
    tone === "red"
      ? active
        ? "text-red-600"
        : "text-ink/25"
      : active
        ? "text-cash-600"
        : "text-ink/25";
  return (
    <div className="card p-5 card-hover">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/50">{label}</p>
        <Icon tone={tone} />
      </div>
      <p className={`font-display font-bold text-3xl tracking-tight mt-1 ${color}`}>
        {money(value)}
      </p>
      {!active && <p className="text-[11px] text-ink/35 mt-1">— all clear</p>}
    </div>
  );
}

/* The signature money-flow viz: curved arcs with animated dots between names */
function SettlementFlow({
  edges,
  nameOf,
  empty,
}: {
  edges: { from: string; to: string; amount: number }[];
  nameOf: (id: string) => string;
  empty: boolean;
}) {
  return (
    <section className="card p-5 stagger">
      <h2 className="font-semibold mb-1">Who owes whom</h2>
      <p className="text-xs text-ink/45 mb-4">Watch the cash flow — it's all worked out for you.</p>
      {empty ? (
        <p className="text-sm text-ink/45">No bills to settle yet — add one on the Bills tab.</p>
      ) : edges.length === 1 ? (
        <SingleFlow from={nameOf(edges[0].from)} to={nameOf(edges[0].to)} amount={edges[0].amount} />
      ) : (
        <ul className="space-y-2.5">
          {edges.map((d, i) => (
            <li key={i} className="flex items-center gap-2 rounded-2xl bg-canvas/70 ring-1 ring-ink/5 px-3 py-3">
              <Avatar name={nameOf(d.from)} />
              <FlowArrow delay={i * 0.35} />
              <Avatar name={nameOf(d.to)} />
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-ink/50">pays</span>
                <span className="font-display font-bold text-lg text-red-600">{money(d.amount)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SingleFlow({ from, to, amount }: { from: string; to: string; amount: number }) {
  return (
    <div className="relative">
      <svg className="w-full h-24" viewBox="0 0 300 80" preserveAspectRatio="none" fill="none">
        <path id="sf" d="M20 62 C 100 20, 200 20, 280 62" stroke="#e3c290" strokeWidth="2" className="flow-path" />
        <circle className="flow-arc" style={{ offsetPath: "path('M20 62 C 100 20, 200 20, 280 62')" }} r="5" fill="#c8873d" />
      </svg>
      <div className="flex items-center gap-2 justify-between px-1">
        <Avatar name={from} />
        <span className="text-xs text-ink/45 font-medium">owes</span>
        <span className="font-display font-bold text-xl text-red-600">{money(amount)}</span>
        <span className="text-xs text-ink/45 font-medium">to</span>
        <Avatar name={to} />
      </div>
    </div>
  );
}

/* Animated arrow between two avatars */
function FlowArrow({ delay }: { delay: number }) {
  return (
    <span className="relative flex-1 h-6 mx-1 overflow-hidden">
      <span className="absolute inset-y-0 left-0 right-0 flex items-center">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500"
          style={{ animation: `flow-x 1.6s ease-in-out ${delay}s infinite` }}
        />
      </span>
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-brand-300" />
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="w-8 h-8 shrink-0 rounded-full bg-brand-100 ring-1 ring-brand/20 grid place-items-center text-xs font-bold text-brand-700">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function OweIcon({ tone }: { tone: string }) {
  const c = tone === "red" ? "#dc2626" : "#5e7c4c";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M16 7l-4-4-4 4" opacity={tone === "red" ? 1 : 0.2} />
      <path d="M8 17l4 4 4-4" opacity={tone === "red" ? 0.2 : 1} />
    </svg>
  );
}
function OwedIcon({ tone }: { tone: string }) {
  const c = tone === "green" ? "#5e7c4c" : "#dc2626";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V3" />
      <path d="M16 17l-4 4-4-4" opacity={1} />
      <path d="M8 7l4-4 4 4" opacity={0.2} />
    </svg>
  );
}

/* Add the flow-x keyframe to index.css scope via a style tag fallback */
