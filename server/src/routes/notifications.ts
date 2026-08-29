import { Router } from "express";
import * as n from "../controllers/notifications";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", n.listNotifications);
router.post("/:id/read", n.markRead);

export default router;
