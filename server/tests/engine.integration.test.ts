import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { generateCycles, generatePayments, getSettlement, monthKey, toMonthDate } from "../src/services/settlement";
import crypto from "crypto";

/**
 * Integration tests against the local SQLite dev database.
 * Uses a dedicated test household and cleans up after itself.
 */
const suffix = crypto.randomBytes(4).toString("hex");
let userIds: string[] = [];
let householdId: string = "";

async function seed() {
  const users = await Promise.all(
    ["alice", "bob", "carol"].map((name, i) =>
      prisma.user.create({
        data: { email: `${name}-${suffix}@test.local`, passwordHash: "x", displayName: name },
      })
    )
  );
  userIds = users.map((u) => u.id);
  const household = await prisma.household.create({
    data: { name: `Test House ${suffix}`, createdBy: userIds[0], inviteCode: `inv-${suffix}` },
  });
  householdId = household.id;
  const memberships = await Promise.all(
    users.map((u, i) =>
      prisma.membership.create({
        data: { householdId, userId: u.id, role: i === 0 ? "admin" : "member" },
      })
    )
  );
  // Rent $1500 paid by alice (creator), equal split 33/33/34
  await prisma.bill.create({
    data: {
      householdId,
      name: "Rent",
      amount: 1500,
      recurrence: "monthly",
      dueDay: 1,
      category: "rent",
      createdBy: userIds[0],
      splits: {
        create: [
          { membershipId: memberships[0].id, splitType: "percentage", splitValue: 33 },
          { membershipId: memberships[1].id, splitType: "percentage", splitValue: 33 },
          { membershipId: memberships[2].id, splitType: "percentage", splitValue: 34 },
        ],
      },
    },
  });
  // Internet $60 paid by bob (creator), bob owes nothing, others 30 each
  await prisma.bill.create({
    data: {
      householdId,
      name: "Internet",
      amount: 60,
      recurrence: "monthly",
      dueDay: 5,
      category: "internet",
      createdBy: userIds[1],
      splits: {
        create: [
          { membershipId: memberships[0].id, splitType: "percentage", splitValue: 50 },
          { membershipId: memberships[1].id, splitType: "percentage", splitValue: 0 },
          { membershipId: memberships[2].id, splitType: "percentage", splitValue: 50 },
        ],
      },
    },
  });
}

describe("settlement engine (integration)", () => {
  it("is idempotent for cycle generation and payment generation", async () => {
    await seed();
    const month = monthKey();

    const first = await generateCycles(prisma, month);
    expect(first).toBe(2);

    const second = await generateCycles(prisma, month);
    expect(second).toBe(0); // no duplicates

    const cycles = await prisma.billCycle.count({ where: { periodMonth: toMonthDate(month), bill: { householdId } } });
    expect(cycles).toBe(2);

    const pay1 = await generatePayments(prisma, householdId, month);
    // Raw: bob owes alice 495, carol owes alice 510, alice owes bob 30, carol owes bob 30.
    // Nets to: bob->alice 435, carol->alice 540 → exactly 2 simplified payments.
    expect(pay1.created).toBe(2);

    const pay2 = await generatePayments(prisma, householdId, month);
    expect(pay2.created).toBe(0); // idempotent — no duplicates

    const paymentCount = await prisma.payment.count({
      where: { settlementMonth: toMonthDate(month), billCycle: { bill: { householdId } } },
    });
    expect(paymentCount).toBe(pay1.created);

    // Raw math: alice paid rent; bob owes 495 (33%), carol owes 510 (34%).
    // Bob paid internet; alice owes 30, carol owes 30.
    // Net pairs: bob->alice 465, carol->alice 480, carol->bob 30. No mutual nets across pairs
    // except none cancel fully — simplify should produce exactly 3 payments.
    const settlement = await getSettlement(prisma, householdId, month);
    expect(settlement.simplified).toHaveLength(2);
    const total = settlement.simplified.reduce((s, r) => s + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(975);
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { billCycle: { bill: { householdId } } } });
    await prisma.billCycle.deleteMany({ where: { bill: { householdId } } });
    await prisma.billSplit.deleteMany({ where: { bill: { householdId } } });
    await prisma.bill.deleteMany({ where: { householdId } });
    await prisma.membership.deleteMany({ where: { householdId } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.household.deleteMany({ where: { id: householdId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
});
