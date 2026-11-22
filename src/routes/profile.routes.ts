import { Router } from "express";
import { getMe, patchMe } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { updateProfileSchema } from "../validators/user.validator.js";

const profileRouter = Router();

profileRouter.use(verifyJWT);

profileRouter.get("/me", asyncHandler(getMe));
profileRouter.patch("/me", validateBody(updateProfileSchema), asyncHandler(patchMe));

export default profileRouter;
