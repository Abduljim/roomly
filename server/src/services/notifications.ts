import { prisma } from "../lib/prisma";
import { sendEmail } from "../utils/email";
import { Prisma } from "@prisma/client";

export type NotificationType =
  | "bill_added"
  | "payment_sent"
  | "payment_confirmed"
  | "due_reminder"
  | "overdue";

export async function createNotification(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>
) {
  const notification = await prisma.notification.create({
    data: { userId, type, payload: payload as Prisma.InputJsonValue },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await sendEmail({
      to: user.email,
      subject: `Roomly: ${type.replace(/_/g, " ")}`,
      body: JSON.stringify(payload),
    });
  }
  return notification;
}
