import { Router } from "express";
import * as p from "../controllers/payments";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/:id/mark-sent", p.markSent);
router.post("/:id/confirm", p.confirm);
router.post("/:id/dispute", p.dispute);

export default router;
