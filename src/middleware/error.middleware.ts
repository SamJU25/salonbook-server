import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import { ApiError } from "../utils/apiError.js";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async Express handler and forwards rejected promises to errorHandler.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handles unmatched API routes with a consistent 404 JSON response.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, "NOT_FOUND"));
}

/**
 * Centralized Express error middleware normalizing domain, validation, upload,
 * and MongoDB errors into safe, consistent JSON responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: err.issues[0]?.message || "Validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image file size must not exceed 5 MB"
        : err.message;
    res.status(400).json({
      success: false,
      code: "UPLOAD_ERROR",
      message,
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: messages[0] || "Invalid input data",
      details: messages,
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      code: "INVALID_ID",
      message: "Invalid resource identifier format",
    });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    res.status(409).json({
      success: false,
      code: "CONFLICT",
      message: "A conflicting record already exists",
    });
    return;
  }

  const isProd = process.env.NODE_ENV === "production";
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: isProd
      ? "An unexpected server error occurred"
      : err instanceof Error
        ? err.message
        : "Internal server error",
  });
}
