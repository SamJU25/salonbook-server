import { Router } from "express";
import {
  getPublicServices,
  getServiceBookedSlots,
  getServiceById,
} from "../controllers/service.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { validateQuery } from "../middleware/validate.middleware.js";
import {
  bookedSlotsQuerySchema,
  listServicesQuerySchema,
} from "../validators/service.validator.js";

const serviceRouter = Router();

// Public browse & home services
serviceRouter.get(
  "/",
  validateQuery(listServicesQuerySchema),
  asyncHandler(getPublicServices)
);

// Protected service details & slot availability
serviceRouter.get("/:id", verifyJWT, asyncHandler(getServiceById));
serviceRouter.get(
  "/:id/booked-slots",
  verifyJWT,
  validateQuery(bookedSlotsQuerySchema),
  asyncHandler(getServiceBookedSlots)
);

export default serviceRouter;
