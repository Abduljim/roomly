import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { ApiError } from "../middleware/errors";
import { generateCycles, generatePayments } from "../services/settlement";
import { createNotification } from "../services/notifications";

export async function myHousehold(req: Request, res: Response, next: NextFunction) {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.id },
      include: { household: true },
      take: 1,
    });
    res.json(memberships.map((m) => m.household));
  } catch (err) {
    next(err);
  }
}

export async function createHousehold(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.body ?? {};
    if (!name) throw new ApiError(400, "Household name is required");
    const household = await prisma.household.create({
      data: {
        name,
        createdBy: req.user!.id,
        inviteCode: crypto.randomBytes(5).toString("hex"),
      },
    });
    await prisma.membership.create({
      data: { householdId: household.id, userId: req.user!.id, role: "admin" },
    });
    res.status(201).json(household);
  } catch (err) {
    next(err);
  }
}

export async function getHousehold(req: Request, res: Response, next: NextFunction) {
  try {
    const household = await prisma.household.findUnique({
      where: { id: req.params.id },
      include: { memberships: { include: { user: true } } },
    });
    if (!household) throw new ApiError(404, "Household not found");
    res.json(household);
  } catch (err) {
    next(err);
  }
}

export async function generateInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const inviteCode = crypto.randomBytes(5).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const household = await prisma.household.update({
      where: { id: req.params.id },
      data: { inviteCode, inviteCodeExpiresAt: expires },
    });
    res.json({ inviteCode, expiresAt: household.inviteCodeExpiresAt });
  } catch (err) {
    next(err);
  }
}

export async function joinHousehold(req: Request, res: Response, next: NextFunction) {
  try {
    const { inviteCode } = req.body ?? {};
    if (!inviteCode) throw new ApiError(400, "inviteCode is required");
    const household = await prisma.household.findUnique({ where: { inviteCode } });
    if (!household) throw new ApiError(404, "Invalid invite code");
    if (household.inviteCodeExpiresAt && household.inviteCodeExpiresAt < new Date()) {
      throw new ApiError(410, "Invite code has expired");
    }
    const existing = await prisma.membership.findUnique({
      where: { householdId_userId: { householdId: household.id, userId: req.user!.id } },
    });
    if (existing) throw new ApiError(409, "You are already a member of this household");
    const membership = await prisma.membership.create({
      data: { householdId: household.id, userId: req.user!.id, role: "member" },
    });
    res.status(201).json({ membership, household });
  } catch (err) {
    next(err);
  }
}

export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const memberships = await prisma.membership.findMany({
      where: { householdId: req.params.id },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });
    res.json(memberships);
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: householdId, userId } = req.params;
    if (userId === req.user!.id) throw new ApiError(400, "Use leave-household flow to remove yourself");
    const membership = await prisma.membership.findUnique({
      where: { householdId_userId: { householdId, userId } },
    });
    if (!membership) throw new ApiError(404, "Member not found");
    // Payment records intentionally kept (edge case: mid-cycle leaver balances remain resolvable)
    await prisma.membership.delete({ where: { id: membership.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function generateSettlementNow(req: Request, res: Response, next: NextFunction) {
  try {
    const householdId = req.params.id;
    const cyclesCreated = await generateCycles(prisma);
    const { created } = await generatePayments(prisma, householdId);
    res.json({ cyclesCreated, paymentsCreated: created });
  } catch (err) {
    next(err);
  }
}

export async function notifyNewBill(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await prisma.membership.findMany({
      where: { householdId: req.params.id, userId: { not: req.user!.id } },
    });
    for (const m of members) {
      await createNotification(m.userId, "bill_added", {
        message: `A new bill "${req.body?.name ?? ""}" was added by ${req.user!.displayName}`,
      });
    }
  } catch (err) {
    next(err);
  }
}
