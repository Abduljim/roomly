import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../middleware/errors";
import { validateSplits } from "../services/settlement";

interface SplitInput {
  membershipId: string;
  splitType: "percentage" | "fixed";
  splitValue: number;
}

export async function createBill(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, amount, recurrence, dueDay, category, splits } = req.body ?? {};
    if (!name || typeof amount !== "number" || amount <= 0) {
      throw new ApiError(400, "name and a positive amount are required");
    }
    if (!["monthly", "one_time"].includes(recurrence)) {
      throw new ApiError(400, "recurrence must be 'monthly' or 'one_time'");
    }
    if (!["rent", "utility", "internet", "other"].includes(category)) {
      throw new ApiError(400, "category must be rent, utility, internet, or other");
    }
    if (recurrence === "monthly" && (typeof dueDay !== "number" || dueDay < 1 || dueDay > 31)) {
      throw new ApiError(400, "monthly bills require dueDay between 1 and 31");
    }
    if (!Array.isArray(splits) || splits.length === 0) {
      throw new ApiError(400, "splits array is required");
    }

    // Validate split membership belongs to this household
    const membershipIds = new Set(
      (await prisma.membership.findMany({ where: { householdId: req.params.id } })).map((m) => m.id)
    );
    for (const s of splits as SplitInput[]) {
      if (!membershipIds.has(s.membershipId)) {
        throw new ApiError(400, "Split references a member not in this household");
      }
    }
    validateSplits(splits, amount);

    const bill = await prisma.bill.create({
      data: {
        householdId: req.params.id,
        name,
        amount,
        recurrence,
        dueDay: recurrence === "monthly" ? dueDay : null,
        category,
        createdBy: req.user!.id,
        splits: {
          create: (splits as SplitInput[]).map((s) => ({
            membershipId: s.membershipId,
            splitType: s.splitType,
            splitValue: s.splitValue,
          })),
        },
      },
      include: { splits: true },
    });
    res.status(201).json(serializeBill(bill));
  } catch (err) {
    next(err);
  }
}

export async function listBills(req: Request, res: Response, next: NextFunction) {
  try {
    const bills = await prisma.bill.findMany({
      where: { householdId: req.params.id, isActive: true },
      include: { splits: { include: { membership: { include: { user: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(bills.map(serializeBill));
  } catch (err) {
    next(err);
  }
}

/** Prisma Decimal fields serialize as strings — normalize money values to numbers for the client. */
function serializeBill(bill: {
  id: string;
  name: string;
  amount: Prisma.Decimal;
  recurrence: string;
  dueDay: number | null;
  category: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  splits: Array<{
    id: string;
    membershipId: string;
    splitType: string;
    splitValue: Prisma.Decimal;
    membership?: unknown;
  }>;
}) {
  return {
    ...bill,
    amount: Number(bill.amount),
    splits: bill.splits.map((s) => ({ ...s, splitValue: Number(s.splitValue) })),
  };
}

export async function editBill(req: Request, res: Response, next: NextFunction) {
  try {
    const bill = await prisma.bill.findUnique({ where: { id: req.params.billId } });
    if (!bill || !bill.isActive) throw new ApiError(404, "Bill not found");
    const { name, amount, dueDay, category, splits } = req.body ?? {};

    if (splits !== undefined) {
      if (!Array.isArray(splits) || splits.length === 0) {
        throw new ApiError(400, "splits must be a non-empty array");
      }
      const newAmount = typeof amount === "number" ? amount : Number(bill.amount);
      validateSplits(splits, newAmount);
      await prisma.billSplit.deleteMany({ where: { billId: bill.id } });
      await prisma.billSplit.createMany({
        data: splits.map((s: SplitInput) => ({
          billId: bill.id,
          membershipId: s.membershipId,
          splitType: s.splitType,
          splitValue: s.splitValue,
        })),
      });
    }

    const updated = await prisma.bill.update({
      where: { id: bill.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(dueDay !== undefined ? { dueDay } : {}),
        ...(category !== undefined ? { category } : {}),
      },
      include: { splits: true },
    });
    // NOTE: edits only affect future cycles — past BillCycles keep their amount_snapshot.
    res.json(serializeBill(updated));
  } catch (err) {
    next(err);
  }
}

export async function archiveBill(req: Request, res: Response, next: NextFunction) {
  try {
    const bill = await prisma.bill.findUnique({ where: { id: req.params.billId } });
    if (!bill) throw new ApiError(404, "Bill not found");
    await prisma.bill.update({ where: { id: bill.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
