import { Router } from "express";
import {
  getPaymentSessionStatus,
  postCreateCheckoutSession,
} from "../controllers/payment.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createCheckoutSessionSchema } from "../validators/payment.validator.js";

const paymentRouter = Router();

paymentRouter.use(verifyJWT, requireRole("customer"));

paymentRouter.post(
  "/create-checkout-session",
  validateBody(createCheckoutSessionSchema),
  asyncHandler(postCreateCheckoutSession)
);

paymentRouter.get(
  "/session-status/:sessionId",
  asyncHandler(getPaymentSessionStatus)
);

export default paymentRouter;
