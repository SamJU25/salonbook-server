import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { getEnv } from "./config/env.js";
import {
  asyncHandler,
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import adminRouter from "./routes/admin.routes.js";
import appointmentRouter from "./routes/appointment.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import profileRouter from "./routes/profile.routes.js";
import serviceRouter from "./routes/service.routes.js";
import uploadRouter from "./routes/upload.routes.js";
import webhookRouter from "./routes/webhook.routes.js";

function parseAllowedOrigins(clientUrlRaw: string): string[] {
  return clientUrlRaw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Builds and configures the Express application without binding to a TCP port.
 */
export function createApp() {
  const app = express();
  const allowedOrigins = parseAllowedOrigins(
    process.env.CLIENT_URL || "http://localhost:3000"
  );

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const normalized = origin.replace(/\/+$/, "");
        if (allowedOrigins.includes(normalized)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  // Root & health check routes (available immediately)
  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      service: "SalonBook API",
      health: "/api/v1/health",
    });
  });

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
      success: true,
      status: "ok",
      dbConnected: mongoose.connection.readyState === 1,
    });
  });

  // Lazily ensure MongoDB connection in serverless runtimes
  app.use(
    "/api/v1",
    asyncHandler(async (_req, _res, next) => {
      if (mongoose.connection.readyState !== 1 && process.env.NODE_ENV !== "test") {
        await connectDB();
      }
      next();
    })
  );

  // Stripe webhook MUST stay mounted before express.json() so raw Buffer is preserved
  app.use("/api/v1/webhooks", webhookRouter);

  // Standard JSON & URL-encoded body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Domain API routes
  app.use("/api/v1/uploads", uploadRouter);
  app.use("/api/v1/services", serviceRouter);
  app.use("/api/v1/appointments", appointmentRouter);
  app.use("/api/v1/payments", paymentRouter);
  app.use("/api/v1/profile", profileRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;

// Validate full runtime env when booting the standalone server entrypoint
export function getBootEnv() {
  return getEnv();
}
