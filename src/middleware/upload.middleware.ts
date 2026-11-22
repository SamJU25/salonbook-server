import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(
        new ApiError(
          400,
          "Only JPEG, PNG, WEBP, and GIF images are allowed",
          "INVALID_FILE_TYPE"
        )
      );
      return;
    }
    cb(null, true);
  },
});
