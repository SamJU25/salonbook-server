import { z } from "zod";
import { SERVICE_STATUSES } from "../constants/salon.js";

export const listServicesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  sort: z.enum(["price_asc", "price_desc", "newest"]).optional().default("newest"),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

export const bookedSlotsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format"),
});

export const createServiceSchema = z.object({
  serviceName: z
    .string()
    .trim()
    .min(2, "Service name must be at least 2 characters")
    .max(120, "Service name cannot exceed 120 characters"),
  category: z
    .string()
    .trim()
    .min(2, "Service category is required")
    .max(80, "Category cannot exceed 80 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  price: z.coerce
    .number()
    .finite("Price must be a valid number")
    .positive("Price must be a positive number"),
  duration: z.coerce
    .number()
    .int("Estimated duration must be a whole number of minutes")
    .positive("Estimated duration must be a positive number"),
  image: z
    .string()
    .trim()
    .refine(
      (val) =>
        val.startsWith("https://") ||
        val.startsWith("http://") ||
        val.startsWith("/images/"),
      "Please upload a valid service image"
    ),
  status: z.enum(SERVICE_STATUSES).optional().default("active"),
});

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update the service",
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
