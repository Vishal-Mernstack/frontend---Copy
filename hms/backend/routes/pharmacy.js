import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import {
  createPharmacyItem,
  getAllPharmacyItems,
  updatePharmacyItem,
  getPharmacyItemById,
  deletePharmacyItem,
} from "../controllers/pharmacyController.js";
import {
  uploadPharmacyFiles,
  bulkInsertMedicines,
} from "../controllers/pharmacyUploadController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempUploadDir = path.join(__dirname, "..", "uploads", "temp");

if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Configure multer for pharmacy file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "pharmacy-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const allowedExts = [".csv", ".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV and Excel files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.get("/", authenticate, authorize(["admin"]), getAllPharmacyItems);
router.post("/", authenticate, authorize(["admin"]), validate(schemas.pharmacyCreate), createPharmacyItem);
router.get("/:id", authenticate, authorize(["admin"]), getPharmacyItemById);
router.put("/:id", authenticate, authorize(["admin"]), validate(schemas.pharmacyUpdate), updatePharmacyItem);
router.delete("/:id", authenticate, authorize(["admin"]), deletePharmacyItem);

// File upload routes
router.post("/upload", authenticate, authorize(["admin"]), upload.array("files", 10), uploadPharmacyFiles);
router.post("/bulk-insert", authenticate, authorize(["admin"]), bulkInsertMedicines);

export default router;
