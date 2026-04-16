import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import {
  getAllBilling,
  getBillingById,
  createBilling,
  updateBilling,
  deleteBilling,
} from "../controllers/billingController.js";

const router = Router();

router.get("/", authenticate, authorize(["admin", "staff", "billing"]), getAllBilling);
router.get("/:id", authenticate, authorize(["admin", "staff", "doctor", "billing", "patient"]), getBillingById);
router.post("/", authenticate, authorize(["admin", "staff", "billing"]), validate(schemas.billingCreate), createBilling);
router.put("/:id", authenticate, authorize(["admin", "staff", "billing"]), validate(schemas.billingUpdate), updateBilling);
router.delete("/:id", authenticate, authorize(["admin", "staff", "billing"]), deleteBilling);

export default router;
