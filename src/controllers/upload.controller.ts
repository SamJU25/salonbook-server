import type { Request, Response } from "express";
import { uploadToImgBB } from "../services/imgbb.service.js";
import { ApiError } from "../utils/apiError.js";

export async function handleImageUpload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ApiError(400, "Please attach an image file to upload", "MISSING_FILE");
  }

  const sanitizedName = req.file.originalname.replace(/\.[^.]+$/, "").slice(0, 60);
  const result = await uploadToImgBB(req.file.buffer, sanitizedName);

  res.status(201).json({
    success: true,
    message: "Image uploaded successfully",
    data: result,
  });
}
