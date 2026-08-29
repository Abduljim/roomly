import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ApiError } from "../middleware/errors";

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "30d" });
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, displayName } = req.body ?? {};
    if (!email || !password || !displayName) {
      throw new ApiError(400, "email, password and displayName are required");
    }
    if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new ApiError(409, "An account with that email already exists");

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
        displayName,
      },
    });
    res.cookie(config.cookieName, signToken(user.id), {
      httpOnly: true,
      sameSite: config.cookieSameSite,
      secure: config.cookieSecure,
      maxAge: 30 * 24 * 3600 * 1000,
    });
    res.status(201).json({ id: user.id, email: user.email, displayName: user.displayName });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) throw new ApiError(400, "email and password are required");
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password");
    }
    res.cookie(config.cookieName, signToken(user.id), {
      httpOnly: true,
      sameSite: config.cookieSameSite,
      secure: config.cookieSecure,
      maxAge: 30 * 24 * 3600 * 1000,
    });
    res.json({ id: user.id, email: user.email, displayName: user.displayName });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    sameSite: config.cookieSameSite,
    secure: config.cookieSecure,
    path: "/",
  });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json(req.user);
}
