import { Router } from "express";
import {
  getAdminServices,
  patchAdminService,
  postAdminService,
  removeAdminService,
} from "../controllers/service.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../validators/service.validator.js";

const adminRouter = Router();

// All admin routes require verified JWT + admin role
adminRouter.use(verifyJWT, requireRole("admin"));

// Admin service management
adminRouter.get("/services", asyncHandler(getAdminServices));
adminRouter.post(
  "/services",
  validateBody(createServiceSchema),
  asyncHandler(postAdminService)
);
adminRouter.patch(
  "/services/:id",
  validateBody(updateServiceSchema),
  asyncHandler(patchAdminService)
);
adminRouter.delete("/services/:id", asyncHandler(removeAdminService));

export default adminRouter;
