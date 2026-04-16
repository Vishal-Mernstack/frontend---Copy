import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  getPatientReports,
  uploadPatientReport,
  deletePatientReport,
} from "../controllers/patientReportController.js";

const router = Router();

router.get("/", authenticate, authorize(["admin", "doctor", "nurse", "receptionist", "patient"]), getPatientReports);

router.post(
  "/upload",
  authenticate,
  authorize(["admin", "doctor", "nurse", "receptionist"]),
  upload.single("file"),
  uploadPatientReport
);

router.delete("/:id", authenticate, authorize(["admin", "doctor", "nurse"]), deletePatientReport);

export default router;
