import { Router } from "express";
import * as b from "../controllers/bills";
import * as s from "../controllers/settlement";
import * as p from "../controllers/payments";
import { requireAuth } from "../middleware/auth";
import { requireHouseholdMember } from "../middleware/household";

const router = Router();

router.use(requireAuth);

// Bills
router.post("/:id/bills", requireHouseholdMember, b.createBill);
router.get("/:id/bills", requireHouseholdMember, b.listBills);
router.put("/bills/:billId", requireHouseholdMember, b.editBill);
router.delete("/bills/:billId", requireHouseholdMember, b.archiveBill);

// Settlement
router.get("/:id/settlement/:month", requireHouseholdMember, s.getSettlementForMonth);

// Payment history
router.get("/:id/payments", requireHouseholdMember, p.paymentHistory);

export default router;
