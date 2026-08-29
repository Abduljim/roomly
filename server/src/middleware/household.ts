import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

/**
 * Reusable household-membership guard.
 * Use after requireAuth. Expects req.params.id OR req.params.householdId to be the household id
 * (or resolves it via req.billId when set by resolveBill).
 */
export async function requireHouseholdMember(req: Request, res: Response, next: NextFunction) {
  try {
    let householdId = req.params.householdId || req.params.id;
    if (!householdId && req.params.billId) {
      const bill = await prisma.bill.findUnique({ where: { id: req.params.billId } });
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      householdId = bill.householdId;
    }
    if (!householdId || !req.user) return res.status(400).json({ error: "Household context missing" });

    const membership = await prisma.membership.findUnique({
      where: { householdId_userId: { householdId, userId: req.user.id } },
    });
    if (!membership) return res.status(403).json({ error: "You are not a member of this household" });
    req.membership = { id: membership.id, role: membership.role, householdId };
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireHouseholdAdmin(req: Request, res: Response, next: NextFunction) {
  requireHouseholdMember(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (req.membership?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}
