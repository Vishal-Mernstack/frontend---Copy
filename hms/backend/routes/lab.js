import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js";
import { createLabOrder, getAllLabOrders, updateLabOrder, uploadLabReport } from "../controllers/labController.js";

const router = Router();

router.get("/", authenticate, authorize(["admin", "staff", "doctor", "nurse", "lab_technician"]), getAllLabOrders);
router.post("/", authenticate, authorize(["admin", "staff", "doctor", "nurse", "lab_technician"]), validate(schemas.labCreate), createLabOrder);
router.put("/:id", authenticate, authorize(["admin", "staff", "doctor", "nurse", "lab_technician"]), validate(schemas.labUpdate), updateLabOrder);
router.post("/:id/report", authenticate, authorize(["admin", "staff", "doctor", "nurse", "lab_technician"]), upload.single("file"), uploadLabReport);

export default router;
