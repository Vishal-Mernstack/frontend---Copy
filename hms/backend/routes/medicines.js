import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { authenticate, authorize } from "../middleware/auth.js";
import * as ctrl from "../controllers/medicinesController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const medicinesUploadDir = path.join(__dirname, "..", "uploads", "medicines");

if (!fs.existsSync(medicinesUploadDir)) {
  fs.mkdirSync(medicinesUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, medicinesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "medicine-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = [".csv", ".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV and Excel files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.get("/", authenticate, authorize(["admin", "staff", "pharmacist", "doctor", "nurse", "receptionist"]), ctrl.getAllMedicines);
router.get("/alerts", authenticate, authorize(["admin", "pharmacist"]), ctrl.getLowStockAlerts);
router.post("/upload", authenticate, authorize(["admin", "pharmacist"]), upload.array("files", 10), ctrl.processMedicineUpload);
router.post("/bulk-insert", authenticate, authorize(["admin", "pharmacist"]), ctrl.bulkInsertMedicines);
router.post("/clean", authenticate, authorize(["admin"]), ctrl.cleanContaminatedData);
router.get("/:id", authenticate, authorize(["admin", "staff", "pharmacist", "doctor", "nurse"]), ctrl.getMedicineById);
router.post("/", authenticate, authorize(["admin", "pharmacist"]), ctrl.createMedicine);
router.put("/:id", authenticate, authorize(["admin", "pharmacist"]), ctrl.updateMedicine);
router.delete("/:id", authenticate, authorize(["admin"]), ctrl.deleteMedicine);

export default router;