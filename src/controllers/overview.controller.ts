import type { Request, Response } from "express";
import * as overviewService from "../services/overview.service.js";

export async function getCustomerDashboardOverview(req: Request, res: Response): Promise<void> {
  const stats = await overviewService.getCustomerOverview(req.user!.id);
  res.status(200).json({
    success: true,
    data: stats,
  });
}

export async function getAdminDashboardOverview(_req: Request, res: Response): Promise<void> {
  const stats = await overviewService.getAdminOverview();
  res.status(200).json({
    success: true,
    data: stats,
  });
}
