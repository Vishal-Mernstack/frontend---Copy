import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middleware/errorHandler.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import { apiRateLimit, authRateLimit, sensitiveRateLimit, uploadRateLimit } from "./middleware/rateLimit.js";
import { auditLogger, requestId } from "./middleware/auditLogger.js";
import { initSocket } from "./config/socket.js";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import doctorRoutes from "./routes/doctors.js";
import appointmentRoutes from "./routes/appointments.js";
import billingRoutes from "./routes/billing.js";
import labRoutes from "./routes/lab.js";
import pharmacyRoutes from "./routes/pharmacy.js";
import medicinesRouter from "./routes/medicines.js";
import notificationRoutes from "./routes/notifications.js";
import departmentRoutes from "./routes/departments.js";
import staffRoutes from "./routes/staff.js";
import hospitalRoutes from "./routes/hospital.js";
import prescriptionRoutes from "./routes/prescriptions.js";
import activityRoutes from "./routes/activity.js";
import userRoutes from "./routes/users.js";
import patientReportRoutes from "./routes/patientReports.js";
import coreRoutes from "./routes/core.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

initSocket(httpServer);
app.disable("etag");

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
  "http://localhost:5177",
  "http://127.0.0.1:5177",
  "http://localhost:5178",
  "http://127.0.0.1:5178",
  "http://localhost:5179",
  "http://127.0.0.1:5179",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8082",
  "http://localhost:8083",
  "http://127.0.0.1:8083",
  "http://localhost:8084",
  "http://127.0.0.1:8084",
  "http://localhost:8085",
  "http://127.0.0.1:8085",
  "http://localhost:8086",
  "http://127.0.0.1:8086",
  "http://localhost:5800",
  "http://127.0.0.1:5800",
  "http://localhost:58142",
  "http://127.0.0.1:58142",
].filter(Boolean);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));
app.use(requestId); // Add request ID tracking
app.use(apiRateLimit); // General rate limiting
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput); // XSS protection - sanitize all input
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/products", express.static(path.join(__dirname, "../products_images")));

// TEMP TEST ROUTE - REMOVE AFTER TEST
app.get("/test-route", (req, res) => res.json({ success: true, test: "works" }));

app.get("/", (req, res) =>
  res.json({ success: true, message: "Medicare HMS API v1" })
);

app.get("/health", (req, res) =>
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

app.get("/debug-routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      routes.push({ path: layer.route.path, methods: layer.route.methods });
    }
  });
  res.json({ routes: routes.filter(r => r.path && r.path.includes("api")) });
});

app.use("/api/v1/auth", authRateLimit, auditLogger('AUTHENTICATION'), authRoutes);
app.use("/api/v1/patients", auditLogger('PATIENT'), patientRoutes);
app.use("/api/v1/doctors", auditLogger('DOCTOR'), doctorRoutes);
app.use("/api/v1/appointments", auditLogger('APPOINTMENT'), appointmentRoutes);
app.use("/api/v1/billing", auditLogger('BILLING'), billingRoutes);
app.use("/api/v1/lab", auditLogger('LAB'), labRoutes);
app.use("/api/v1/medicines", auditLogger('MEDICINE'), medicinesRouter);
app.use("/api/v1/pharmacy", auditLogger('PHARMACY'), pharmacyRoutes);
app.use("/api/v1/notifications", auditLogger('NOTIFICATION'), notificationRoutes);
app.use("/api/v1/departments", auditLogger('DEPARTMENT'), departmentRoutes);
app.use("/api/v1/staff", auditLogger('STAFF'), staffRoutes);
app.use("/api/v1/hospital", hospitalRoutes);
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/v1/activity", activityRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/patient-reports", patientReportRoutes);
app.use("/api/v1/core", coreRoutes);

app.use((req, res) => {
  // Ensure CORS headers for 404 responses
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "127.0.0.1";
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (process.env.NODE_ENV !== "test" && isDirectRun) {
  httpServer.listen(PORT, HOST, () => {
    console.log(`Medicare HMS API running on http://${HOST}:${PORT}`);
    console.log(`Health: http://${HOST}:${PORT}/health`);
  });
}

export default app;
