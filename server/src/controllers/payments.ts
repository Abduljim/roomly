import { Request, Response, NextFunction } from "express";
import { $Enums } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../middleware/errors";
import { createNotification } from "../services/notifications";
import { toMonthDate } from "../services/settlement-core";

async function getPaymentForUser(paymentId: string, userId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { payer: true, payee: true, billCycle: { include: { bill: true } } },
  });
  if (!payment) throw new ApiError(404, "Payment not found");
  const isInvolved =
    payment.payer.userId === userId || payment.payee.userId === userId;
  if (!isInvolved) throw new ApiError(403, "You are not a party to this payment");
  return payment;
}

export async function markSent(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await getPaymentForUser(req.params.id, req.user!.id);
    if (payment.payer.userId !== req.user!.id) {
      throw new ApiError(403, "Only the payer can mark a payment as sent");
    }
    if (payment.status !== "pending") {
      throw new ApiError(409, `Payment is already ${payment.status}`);
    }
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "sent", sentAt: new Date(), note: req.body?.note ?? payment.note },
    });
    await createNotification(payment.payee.userId, "payment_sent", {
      paymentId: payment.id,
      amount: payment.amount,
      from: req.user!.displayName,
      note: req.body?.note ?? null,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await getPaymentForUser(req.params.id, req.user!.id);
    if (payment.payee.userId !== req.user!.id) {
      throw new ApiError(403, "Only the recipient can confirm a payment");
    }
    if (payment.status !== "sent") {
      throw new ApiError(409, `Only 'sent' payments can be confirmed (current: ${payment.status})`);
    }
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "confirmed", confirmedAt: new Date() },
    });
    await createNotification(payment.payer.userId, "payment_confirmed", {
      paymentId: payment.id,
      amount: payment.amount,
      from: req.user!.displayName,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function dispute(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await getPaymentForUser(req.params.id, req.user!.id);
    if (payment.payee.userId !== req.user!.id) {
      throw new ApiError(403, "Only the recipient can dispute a payment");
    }
    if (!["sent", "pending"].includes(payment.status)) {
      throw new ApiError(409, `Payment is already ${payment.status}`);
    }
    const note = req.body?.note;
    if (!note) throw new ApiError(400, "A note explaining the dispute is required");
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "disputed", note },
    });
    // Notify both parties
    await createNotification(payment.payee.userId, "overdue", {
      paymentId: payment.id,
      message: `Payment of $${payment.amount.toFixed(2)} was disputed`,
      note,
    });
    await createNotification(payment.payer.userId, "overdue", {
      paymentId: payment.id,
      message: `${req.user!.displayName} disputed your payment of $${payment.amount.toFixed(2)}`,
      note,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function paymentHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { month, memberId, status } = req.query as Record<string, string | undefined>;
    const periodMonth = month ? toMonthDate(`${month}-01`) : undefined;
    const payments = await prisma.payment.findMany({
      where: {
        billCycle: { bill: { householdId: req.params.id } },
        ...(periodMonth ? { settlementMonth: periodMonth } : {}),
        ...(status ? { status: status as $Enums.PaymentStatus } : {}),
        ...(memberId
          ? { OR: [{ payerMembershipId: memberId }, { payeeMembershipId: memberId }] }
          : {}),
      },
      include: {
        payer: { include: { user: true } },
        payee: { include: { user: true } },
        billCycle: { include: { bill: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        note: p.note,
        sentAt: p.sentAt,
        confirmedAt: p.confirmedAt,
        createdAt: p.createdAt,
        settlementMonth: p.settlementMonth,
        payerMembershipId: p.payerMembershipId,
        payeeMembershipId: p.payeeMembershipId,
        payerName: p.payer.user.displayName,
        payeeName: p.payee.user.displayName,
        billName: p.billCycle.bill.name,
      }))
    );
  } catch (err) {
    next(err);
  }
}
