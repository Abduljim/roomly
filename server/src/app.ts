import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./config";
import authRoutes from "./routes/auth";
import householdRoutes from "./routes/households";
import householdDataRoutes from "./routes/households-data";
import paymentRoutes from "./routes/payments";
import notificationRoutes from "./routes/notifications";
import { errorHandler } from "./middleware/errors";

export function createApp() {
  const app = express();
  // CLIENT_URL may be a comma-separated list (prod URL, preview URLs, local dev).
  const allowed = config.clientUrl.split(",").map((u) => u.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowed.includes(origin) || allowed.includes("*")) return cb(null, true);
        cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/auth", authRoutes);
  app.use("/api/households", householdRoutes);
  app.use("/api/households", householdDataRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/notifications", notificationRoutes);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);
  return app;
}
