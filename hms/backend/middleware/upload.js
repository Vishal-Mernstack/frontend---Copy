import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDirs = path.join(__dirname, "..", "uploads");

const categories = ["lab-reports", "prescriptions", "documents", "avatars", "medicines"];

categories.forEach((cat) => {
  const dir = path.join(uploadDirs, cat);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || "documents";
    const uploadPath = path.join(uploadDirs, category);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const generalFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const medicinesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(uploadDirs, "medicines"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "medicine-" + uniqueSuffix + ext);
  },
});

const medicinesFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const allowedExtensions = [".csv", ".xlsx", ".xls"];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only CSV and Excel files are allowed."));
  }
};

export const upload = multer({
  storage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const uploadMedicines = multer({
  storage: medicinesStorage,
  fileFilter: medicinesFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const uploadCategories = categories;