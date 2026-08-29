import { Router } from "express";
import * as auth from "../controllers/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/signup", auth.signup);
router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.get("/me", requireAuth, auth.me);

export default router;
