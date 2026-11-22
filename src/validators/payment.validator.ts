import { z } from "zod";
import { isValidObjectId } from "../utils/objectId.js";

export const createCheckoutSessionSchema = z.object({
  appointmentId: z
    .string()
    .trim()
    .refine(isValidObjectId, "Invalid appointment identifier"),
});

export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionSchema
>;
