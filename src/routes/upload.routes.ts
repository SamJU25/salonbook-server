import { Router } from "express";
import { handleImageUpload } from "../controllers/upload.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { imageUpload } from "../middleware/upload.middleware.js";

const uploadRouter = Router();

uploadRouter.post(
  "/image",
  imageUpload.single("image"),
  asyncHandler(handleImageUpload)
);

export default uploadRouter;
