import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middleware/errorHandler.js";
import { initSocket } from "./config/socket.js";
import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import doctorRoutes from "./routes/doctors.js";
import appointmentRoutes from "./routes/appointments.js";
import billingRoutes from "./routes/billing.js";
import labRoutes from "./routes/lab.js";
import pharmacyRoutes from "./routes/pharmacy.js";
import notificationRoutes from "./routes/notifications.js";

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
  "http://localhost:8080",
  "http://127.0.0.1:8080",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/lab", labRoutes);
app.use("/api/v1/pharmacy", pharmacyRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  })
);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "127.0.0.1";
httpServer.listen(PORT, HOST, () => {
  console.log(`Medicare HMS API running on http://${HOST}:${PORT}`);
  console.log(`Health: http://${HOST}:${PORT}/health`);
});

export default app;
