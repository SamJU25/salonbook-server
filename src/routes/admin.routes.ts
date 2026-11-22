import { Router } from "express";
import {
  getAdminAppointments,
  patchAdminAppointmentStatus,
} from "../controllers/appointment.controller.js";
import { getAdminDashboardOverview } from "../controllers/overview.controller.js";
import {
  getAdminServices,
  patchAdminService,
  postAdminService,
  removeAdminService,
} from "../controllers/service.controller.js";
import {
  getAdminUserById,
  getAdminUsers,
  patchAdminUserBlock,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { adminUpdateAppointmentStatusSchema } from "../validators/appointment.validator.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../validators/service.validator.js";
import { toggleUserBlockSchema } from "../validators/user.validator.js";

const adminRouter = Router();

// All admin routes require verified JWT + admin role
adminRouter.use(verifyJWT, requireRole("admin"));

// Admin overview
adminRouter.get("/overview", asyncHandler(getAdminDashboardOverview));

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

// Admin appointment management
adminRouter.get("/appointments", asyncHandler(getAdminAppointments));
adminRouter.patch(
  "/appointments/:id/status",
  validateBody(adminUpdateAppointmentStatusSchema),
  asyncHandler(patchAdminAppointmentStatus)
);

// Admin user management
adminRouter.get("/users", asyncHandler(getAdminUsers));
adminRouter.get("/users/:id", asyncHandler(getAdminUserById));
adminRouter.patch(
  "/users/:id/block",
  validateBody(toggleUserBlockSchema),
  asyncHandler(patchAdminUserBlock)
);

export default adminRouter;
