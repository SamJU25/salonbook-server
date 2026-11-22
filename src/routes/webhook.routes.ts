import express, { Router } from "express";
import { postStripeWebhook } from "../controllers/payment.controller.js";
import { asyncHandler } from "../middleware/error.middleware.js";

const webhookRouter = Router();

// Stripe signature verification requires the unparsed raw request buffer.
webhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  asyncHandler(postStripeWebhook)
);

export default webhookRouter;
