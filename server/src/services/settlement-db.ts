import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../middleware/errors";
import { createNotification } from "./notifications";
import { RawBalance, SimplifiedDebt, monthKey, round2, simplifyDebts, toMonthDate } from "./settlement-core";

export * from "./settlement-core";

/**
 * Cycle generation: idempotent. Creates BillCycle rows for every active monthly bill
 * for the given period, snapshotting the amount. Unique (billId, periodMonth) guards duplicates.
 */
export async function generateCycles(db: PrismaClient, periodMonth: string = monthKey()) {
  const bills = await db.bill.findMany({ where: { isActive: true, recurrence: "monthly" } });
  let created = 0;
  for (const bill of bills) {
    const existing = await db.billCycle.findUnique({
      where: { billId_periodMonth: { billId: bill.id, periodMonth: toMonthDate(periodMonth) } },
    });
    if (existing) continue;
    await db.billCycle.create({
      data: { billId: bill.id, periodMonth: toMonthDate(periodMonth), amountSnapshot: bill.amount },
    });
    created++;
  }
  return created;
}

/** Raw balances for a household + month: every non-payer member owes their share to the bill's designated payer. */
export async function computeRawBalances(
  db: PrismaClient,
  householdId: string,
  periodMonth: string
): Promise<RawBalance[]> {
  const cycles = await db.billCycle.findMany({
    where: { periodMonth: toMonthDate(periodMonth), bill: { householdId, isActive: true } },
    include: { bill: { include: { splits: true } } },
  });

  const raw: RawBalance[] = [];
  for (const cycle of cycles) {
    // Designated payer = bill creator (v1 default)
    const payer = await db.membership.findUnique({
      where: { householdId_userId: { householdId, userId: cycle.bill.createdBy } },
    });
    if (!payer) continue; // payer left household; skip their bills this cycle

    for (const split of cycle.bill.splits) {
      if (split.membershipId === payer.id) continue;
      const amount =
        split.splitType === "percentage"
          ? round2((Number(cycle.amountSnapshot) * Number(split.splitValue)) / 100)
          : round2(Number(split.splitValue));
      if (amount <= 0) continue;
      raw.push({ from: split.membershipId, to: payer.id, amount });
    }
  }
  return raw;
}

export interface SettlementView {
  month: string;
  simplified: SimplifiedDebt[];
  memberBalances: Array<{ membershipId: string; displayName: string; owed: number; owes: number; net: number }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    note: string | null;
    payerMembershipId: string;
    payeeMembershipId: string;
    payerName: string;
    payeeName: string;
    sentAt: Date | null;
    confirmedAt: Date | null;
  }>;
}

/** Full settlement view for a household + month. */
export async function getSettlement(
  db: PrismaClient,
  householdId: string,
  periodMonth: string
): Promise<SettlementView> {
  const [memberships, raw, payments] = await Promise.all([
    db.membership.findMany({ where: { householdId }, include: { user: true } }),
    computeRawBalances(db, householdId, periodMonth),
    db.payment.findMany({
      where: { settlementMonth: toMonthDate(periodMonth), billCycle: { bill: { householdId } } },
      include: { payer: { include: { user: true } }, payee: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const balances = new Map<string, { owed: number; owes: number }>();
  for (const m of memberships) balances.set(m.id, { owed: 0, owes: 0 });
  for (const r of raw) {
    const from = balances.get(r.from);
    const to = balances.get(r.to);
    if (from) from.owes = round2(from.owes + r.amount);
    if (to) to.owed = round2(to.owed + r.amount);
  }

  return {
    month: periodMonth,
    simplified: simplifyDebts(raw),
    memberBalances: memberships.map((m) => {
      const b = balances.get(m.id)!;
      return {
        membershipId: m.id,
        displayName: m.user.displayName,
        owed: b.owed,
        owes: b.owes,
        net: round2(b.owed - b.owes),
      };
    }),
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status as string,
      note: p.note,
      payerMembershipId: p.payerMembershipId,
      payeeMembershipId: p.payeeMembershipId,
      payerName: p.payer.user.displayName,
      payeeName: p.payee.user.displayName,
      sentAt: p.sentAt,
      confirmedAt: p.confirmedAt,
    })),
  };
}

/**
 * Generate pending Payment records for a household + month, idempotently.
 * Regenerating never duplicates — existing payments for the month short-circuit.
 */
export async function generatePayments(
  db: PrismaClient,
  householdId: string,
  periodMonth: string = monthKey()
): Promise<{ created: number }> {
  const existing = await db.payment.count({
    where: { settlementMonth: toMonthDate(periodMonth), billCycle: { bill: { householdId } } },
  });
  if (existing > 0) return { created: 0 };

  const raw = await computeRawBalances(db, householdId, periodMonth);
  const simplified = simplifyDebts(raw);
  if (simplified.length === 0) return { created: 0 };

  const firstCycle = await db.billCycle.findFirst({
    where: { periodMonth: toMonthDate(periodMonth), bill: { householdId } },
    orderBy: { createdAt: "asc" },
  });
  if (!firstCycle) return { created: 0 };

  await db.payment.createMany({
    data: simplified.map((d) => ({
      billCycleId: firstCycle.id,
      payerMembershipId: d.from,
      payeeMembershipId: d.to,
      amount: d.amount,
      status: "pending",
      settlementMonth: toMonthDate(periodMonth),
    })),
  });

  // Notify involved members about new pending payments
  const memberships = await db.membership.findMany({ where: { householdId }, include: { user: true } });
  for (const d of simplified) {
    const payer = memberships.find((m) => m.id === d.from);
    const payee = memberships.find((m) => m.id === d.to);
    if (payee) {
      await createNotification(payee.userId, "payment_sent", {
        message: `New pending payment of $${d.amount.toFixed(2)} from ${payer?.user.displayName ?? "a member"} to you`,
        amount: d.amount,
      });
    }
  }
  return { created: simplified.length };
}

/** Validate splits: percentages must sum to 100, fixed must sum to bill amount (±1 cent). */
export function validateSplits(
  splits: Array<{ splitType: string; splitValue: number }>,
  billAmount: number
): void {
  if (!splits || splits.length === 0) {
    throw new ApiError(400, "At least one split is required");
  }
  if (splits.some((s) => !["percentage", "fixed"].includes(s.splitType))) {
    throw new ApiError(400, "Invalid split type");
  }
  const sum = round2(splits.reduce((acc, s) => acc + s.splitValue, 0));
  if (splits.every((s) => s.splitType === "percentage") && Math.abs(sum - 100) > 0.01) {
    throw new ApiError(400, `Percentage splits must sum to 100% (current sum: ${sum}%)`);
  }
  if (splits.every((s) => s.splitType === "fixed") && Math.abs(sum - billAmount) > 0.01) {
    throw new ApiError(400, `Fixed splits must sum to the bill amount $${billAmount.toFixed(2)} (current sum: $${sum.toFixed(2)})`);
  }
}

