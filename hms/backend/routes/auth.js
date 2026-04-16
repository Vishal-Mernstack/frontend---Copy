import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import { login, me, register, refreshToken } from "../controllers/authController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.post("/register", validate(schemas.register), register);
router.post("/create-user", authenticate, authorize(["admin"]), validate(schemas.register), register);
router.post("/login", validate(schemas.login), login);
router.post("/refresh", refreshToken);
router.get("/me", authenticate, me);

export default router;
