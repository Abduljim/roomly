export type RawBalance = { from: string; to: string; amount: number };
export type SimplifiedDebt = { from: string; to: string; amount: number };

import { ApiError } from "../middleware/errors";

const EPS = 0.005; // half a cent

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Debt simplification: nets mutual debts and greedily settles circular chains
 * so the minimum number of transactions is displayed.
 * Pure function — no DB access. Fully unit-tested.
 */
export function simplifyDebts(rawBalances: RawBalance[]): SimplifiedDebt[] {
  const net = new Map<string, number>(); // "a|b" (a<b) -> signed amount

  for (const { from, to, amount } of rawBalances) {
    if (from === to) continue;
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    const signed = from < to ? amount : -amount;
    net.set(key, round2((net.get(key) ?? 0) + signed));
  }

  // Balance per member: positive = is owed, negative = owes
  const balance = new Map<string, number>();
  for (const [key, amount] of net) {
    if (Math.abs(amount) < EPS) continue;
    const [a, b] = key.split("|");
    // amount > 0 means a owes b; amount < 0 means b owes |amount| to a
    balance.set(a, round2((balance.get(a) ?? 0) - amount));
    balance.set(b, round2((balance.get(b) ?? 0) + amount));
  }

  const creditors: Array<{ id: string; amt: number }> = [];
  const debtors: Array<{ id: string; amt: number }> = [];
  for (const [id, amt] of balance) {
    if (amt > EPS) creditors.push({ id, amt });
    else if (amt < -EPS) debtors.push({ id, amt: -amt });
  }
  creditors.sort((x, y) => y.amt - x.amt);
  debtors.sort((x, y) => y.amt - x.amt);

  // Greedy match largest debtor to largest creditor -> minimal transaction count
  const result: SimplifiedDebt[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const settled = round2(Math.min(c.amt, d.amt));
    result.push({ from: d.id, to: c.id, amount: settled });
    c.amt = round2(c.amt - settled);
    d.amt = round2(d.amt - settled);
    if (c.amt <= EPS) ci++;
    if (d.amt <= EPS) di++;
  }
  return result.filter((d) => d.amount > EPS);
}

export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Convert a "YYYY-MM-01" month key to a UTC Date for Prisma DateTime columns. */
export function toMonthDate(month: string): Date {
  return new Date(`${month}T00:00:00.000Z`);
}

export function validateMonthParam(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ApiError(400, "Month must be in YYYY-MM format");
  }
  const [y, m] = month.split("-").map(Number);
  if (m < 1 || m > 12) throw new ApiError(400, "Invalid month");
  return `${y}-${String(m).padStart(2, "0")}-01`;
}
