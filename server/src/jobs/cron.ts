import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { generateCycles, generatePayments, monthKey } from "../services/settlement";
import { sendEmail } from "../utils/email";

/**
 * Monthly cycle generation: 1st of each month at 00:05.
 * Idempotent — safe even if triggered multiple times.
 */
export function startCronJobs() {
  cron.schedule("5 0 1 * *", async () => {
    try {
      console.log("[cron] Generating monthly bill cycles...");
      await generateCycles(prisma);
      const households = await prisma.household.findMany({ select: { id: true } });
      for (const h of households) {
        await generatePayments(prisma, h.id);
      }
      console.log("[cron] Cycle generation complete.");
    } catch (err) {
      console.error("[cron] Cycle generation failed:", err);
    }
  });

  // Due-date reminders: 9:00 daily; remind 3 days before due and overdue.
  cron.schedule("0 9 * * *", async () => {
    try {
      await sendDueReminders();
    } catch (err) {
      console.error("[cron] Reminder job failed:", err);
    }
  });

  console.log("[cron] Scheduled jobs started");
}

export async function sendDueReminders() {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const payments = await prisma.payment.findMany({
    where: { status: { in: ["pending", "sent"] } },
    include: {
      payer: { include: { user: true } },
      billCycle: { include: { bill: true } },
    },
  });

  for (const p of payments) {
    const dueDay = p.billCycle.bill.dueDay;
    if (!dueDay) continue;
    if (dayOfMonth === dueDay - 3 || (dueDay <= 3 && dayOfMonth >= 28)) {
      await sendEmail({
        to: p.payer.user.email,
        subject: "Roomly: upcoming payment due",
        body: `"${p.billCycle.bill.name}" is due on the ${dueDay}. Amount: $${p.amount.toFixed(2)}`,
      });
    } else if (dayOfMonth > dueDay) {
      await sendEmail({
        to: p.payer.user.email,
        subject: "Roomly: overdue payment reminder",
        body: `"${p.billCycle.bill.name}" was due on the ${dueDay} and is still unpaid ($${p.amount.toFixed(2)}).`,
      });
    }
  }
}
