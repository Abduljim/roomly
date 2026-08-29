import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getSettlement, validateMonthParam } from "../services/settlement";

export async function getSettlementForMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const periodMonth = validateMonthParam(req.params.month);
    const settlement = await getSettlement(prisma, req.params.id, periodMonth);
    res.json(settlement);
  } catch (err) {
    next(err);
  }
}
