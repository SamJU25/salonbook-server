import { Router } from "express";
import { getCustomerDashboardOverview } from "../controllers/overview.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const dashboardRouter = Router();

dashboardRouter.get(
  "/customer-overview",
  verifyJWT,
  requireRole("customer"),
  asyncHandler(getCustomerDashboardOverview)
);

export default dashboardRouter;
