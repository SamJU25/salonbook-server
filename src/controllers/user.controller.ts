import type { Request, Response } from "express";
import * as userService from "../services/user.service.js";
import type {
  ToggleUserBlockInput,
  UpdateProfileInput,
} from "../validators/user.validator.js";

export async function getMe(req: Request, res: Response): Promise<void> {
  const profile = await userService.getOwnProfile(req.user!.id);
  res.status(200).json({
    success: true,
    data: profile,
  });
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateProfileInput;
  const updated = await userService.updateOwnProfile(req.user!.id, input);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updated,
  });
}

export async function getAdminUsers(_req: Request, res: Response): Promise<void> {
  const users = await userService.listCustomersAdmin();
  res.status(200).json({
    success: true,
    data: users,
  });
}

export async function getAdminUserById(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const user = await userService.getUserDetailsAdmin(id);
  res.status(200).json({
    success: true,
    data: user,
  });
}

export async function patchAdminUserBlock(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id ?? "");
  const { isBlocked } = req.body as ToggleUserBlockInput;
  const updated = await userService.setUserBlockedAdmin(id, isBlocked, req.user!.id);
  res.status(200).json({
    success: true,
    message: isBlocked ? "User blocked successfully" : "User unblocked successfully",
    data: updated,
  });
}
