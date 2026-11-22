import { z } from "zod";

const imageUrlOrNullSchema = z
  .union([
    z
      .string()
      .trim()
      .refine(
        (val) =>
          val === "" ||
          val.startsWith("https://") ||
          val.startsWith("http://") ||
          val.startsWith("/images/"),
        "Please provide a valid image URL"
      ),
    z.null(),
  ])
  .optional()
  .transform((val) => (val === "" ? null : val));

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(120, "Name cannot exceed 120 characters")
      .optional(),
    image: imageUrlOrNullSchema,
    phone: z
      .union([
        z
          .string()
          .trim()
          .max(30, "Phone number cannot exceed 30 characters"),
        z.null(),
      ])
      .optional()
      .transform((val) => (val === "" ? null : val)),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.image !== undefined ||
      data.phone !== undefined,
    { message: "Please provide at least one permitted field to update" }
  );

export const toggleUserBlockSchema = z.object({
  isBlocked: z.boolean({
    required_error: "isBlocked boolean flag is required",
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ToggleUserBlockInput = z.infer<typeof toggleUserBlockSchema>;
