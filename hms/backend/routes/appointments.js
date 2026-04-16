import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  APPOINTMENT_STATUSES,
} from "../controllers/appointmentController.js";

const router = Router();

router.get("/statuses", (req, res) => res.json({ success: true, data: APPOINTMENT_STATUSES }));
router.get("/", authenticate, authorize(["admin", "staff", "doctor", "nurse", "receptionist", "patient"]), getAllAppointments);
router.get("/:id", authenticate, authorize(["admin", "staff", "doctor", "nurse", "receptionist", "patient"]), getAppointmentById);
router.post("/", authenticate, authorize(["admin", "staff", "nurse", "receptionist"]), validate(schemas.appointmentCreate), createAppointment);
router.put("/:id", authenticate, authorize(["admin", "staff", "doctor", "nurse", "receptionist"]), validate(schemas.appointmentUpdate), updateAppointment);
router.delete("/:id", authenticate, authorize(["admin", "staff", "receptionist"]), deleteAppointment);

export default router;
