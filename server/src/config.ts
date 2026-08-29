export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  cookieName: "roomly_token",
  // Cross-origin deployments (Vercel client -> hosted API) need SameSite=None; Secure.
  cookieSecure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
  cookieSameSite: (process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true"
    ? "none"
    : "lax") as "none" | "lax",
};
