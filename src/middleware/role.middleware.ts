import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../constants/salon.js";
import { ApiError } from "../utils/apiError.js";

/**
 * Enforces server-side role authorization after verifyJWT.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Authentication required", "UNAUTHORIZED"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ApiError(
          403,
          "You do not have permission to access this resource",
          "FORBIDDEN"
        )
      );
      return;
    }

    next();
  };
}
