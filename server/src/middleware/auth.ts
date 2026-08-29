import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../lib/prisma";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      membership?: { id: string; role: string; householdId: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    prisma.user
      .findUnique({ where: { id: payload.sub } })
      .then((user) => {
        if (!user) return res.status(401).json({ error: "User not found" });
        req.user = { id: user.id, email: user.email, displayName: user.displayName };
        next();
      })
      .catch(next);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
