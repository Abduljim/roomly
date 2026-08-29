import { Router } from "express";
import * as h from "../controllers/households";
import { requireAuth } from "../middleware/auth";
import { requireHouseholdAdmin, requireHouseholdMember } from "../middleware/household";

const router = Router();

router.use(requireAuth);

router.post("/", h.createHousehold);
router.get("/mine", h.myHousehold);
router.post("/join", h.joinHousehold);
router.post("/:id/invite", requireHouseholdAdmin, h.generateInvite);
router.get("/:id", requireHouseholdMember, h.getHousehold);
router.get("/:id/members", requireHouseholdMember, h.listMembers);
router.delete("/:id/members/:userId", requireHouseholdAdmin, h.removeMember);
router.post("/:id/settlement/generate", requireHouseholdMember, h.generateSettlementNow);
router.post("/:id/notify-bill", requireHouseholdMember, h.notifyNewBill);

export default router;
