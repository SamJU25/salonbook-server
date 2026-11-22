import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const seedEnvSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  BETTER_AUTH_URL: z
    .string()
    .url("BETTER_AUTH_URL must be a valid URL")
    .default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),
  SEED_ADMIN_NAME: z.string().default("SalonBook Admin"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@salonbook.com"),
  SEED_ADMIN_PASSWORD: z.string().min(6).default("Admin@1234"),
});

const envSchema = seedEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLIENT_URL: z
    .string()
    .trim()
    .default("http://localhost:3000")
    .refine(
      (val) =>
        val
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean)
          .every((u) => z.string().url().safeParse(u).success),
      "CLIENT_URL must be a valid URL or comma-separated list of valid URLs"
    ),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  IMGBB_API_KEY: z.string().min(1, "IMGBB_API_KEY is required"),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;
export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates and returns minimal environment variables needed for DB seeding.
 */
export function getSeedEnv(): SeedEnv {
  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid seed environment configuration:\n${formatted}`);
  }
  return parsed.data;
}

/**
 * Validates and caches runtime environment variables using Zod.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
