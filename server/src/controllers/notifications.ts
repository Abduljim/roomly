import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unread = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unread });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: "Notification not found" });
    }
    await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
