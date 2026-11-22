import mongoose from "mongoose";
import { ApiError } from "./apiError.js";

/**
 * Checks whether a string is a canonical 24-hex MongoDB ObjectId.
 * Avoids false positives on arbitrary 12-byte strings.
 */
export function isValidObjectId(id: string): boolean {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  return new mongoose.Types.ObjectId(id).toHexString() === id.toLowerCase();
}

/**
 * Throws a 400 ApiError if the provided identifier is not a valid ObjectId.
 */
export function assertValidObjectId(id: string, label = "Resource"): void {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label} ID`, "INVALID_ID");
  }
}
