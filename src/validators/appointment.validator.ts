import { z } from "zod";
import { PREDEFINED_TIME_SLOTS } from "../constants/salon.js";
import { isValidCalendarDate } from "../utils/date.js";
import { isValidObjectId } from "../utils/objectId.js";

export const createAppointmentSchema = z.object({
  serviceId: z
    .string()
    .trim()
    .refine(isValidObjectId, "Invalid service identifier"),
  appointmentDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Appointment date must use YYYY-MM-DD format")
    .refine(isValidCalendarDate, "Appointment date must be a valid calendar date"),
  timeSlot: z.enum(PREDEFINED_TIME_SLOTS, {
    errorMap: () => ({ message: "Please select a valid available time slot" }),
  }),
  message: z
    .string()
    .trim()
    .max(500, "Additional message cannot exceed 500 characters")
    .optional()
    .default(""),
});

export const adminUpdateAppointmentStatusSchema = z.object({
  status: z.enum(["confirmed", "cancelled"], {
    errorMap: () => ({ message: "Status must be confirmed or cancelled" }),
  }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type AdminUpdateAppointmentStatusInput = z.infer<
  typeof adminUpdateAppointmentStatusSchema
>;
