import { Router } from "express";
import {
  getAppointmentById,
  getMyAppointments,
  patchCancelMyAppointment,
  postCreateAppointment,
} from "../controllers/appointment.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createAppointmentSchema } from "../validators/appointment.validator.js";

const appointmentRouter = Router();

appointmentRouter.use(verifyJWT);

// Customer booking & appointment management
appointmentRouter.post(
  "/",
  requireRole("customer"),
  validateBody(createAppointmentSchema),
  asyncHandler(postCreateAppointment)
);
appointmentRouter.get(
  "/my",
  requireRole("customer"),
  asyncHandler(getMyAppointments)
);
appointmentRouter.patch(
  "/:id/cancel",
  requireRole("customer"),
  asyncHandler(patchCancelMyAppointment)
);

// Shared appointment details (customer own or admin)
appointmentRouter.get("/:id", asyncHandler(getAppointmentById));

export default appointmentRouter;
