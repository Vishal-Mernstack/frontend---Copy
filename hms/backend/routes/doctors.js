import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctorController.js";

const router = Router();

router.get("/", authenticate, authorize(["admin", "staff", "doctor", "nurse", "receptionist", "patient"]), getAllDoctors);
router.get("/:id", authenticate, authorize(["admin", "staff", "doctor", "nurse", "receptionist", "patient"]), getDoctorById);
router.post("/", authenticate, authorize(["admin", "staff"]), validate(schemas.doctorCreate), createDoctor);
router.put("/:id", authenticate, authorize(["admin", "staff"]), validate(schemas.doctorUpdate), updateDoctor);
router.delete("/:id", authenticate, authorize(["admin"]), deleteDoctor);

export default router;
