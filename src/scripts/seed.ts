import mongoose from "mongoose";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connectDB, disconnectDB } from "../config/db.js";
import { getSeedEnv, type SeedEnv } from "../config/env.js";
import { Service } from "../models/service.model.js";
import { User } from "../models/user.model.js";

const SAMPLE_SERVICES = [
  {
    serviceName: "Signature Tailored Haircut & Blowout",
    category: "Haircut & Styling",
    description:
      "Personalized consultation, precision haircut tailored to your face shape, soothing botanical wash, and signature blowout finish.",
    price: 65,
    duration: 60,
    image: "/images/services/haircut-styling.jpg",
    status: "active" as const,
  },
  {
    serviceName: "Dimensional Balayage & Gloss",
    category: "Hair Coloring",
    description:
      "Hand-painted sun-kissed highlights paired with a bond-protecting botanical gloss for luminous, low-maintenance color.",
    price: 165,
    duration: 150,
    image: "/images/services/hair-coloring.jpg",
    status: "active" as const,
  },
  {
    serviceName: "Nano-Mist & Steam Keratin Therapy",
    category: "Hair Treatment",
    description:
      "Warm nano-mist steam and silk protein infusion applied at the wash basin to repair damaged cuticles and lock in lasting glass-hair shine.",
    price: 130,
    duration: 90,
    image: "/images/services/hair-treatment.jpg",
    status: "active" as const,
  },
  {
    serviceName: "Calm Radiance Botanical Facial",
    category: "Facial & Skincare",
    description:
      "Gentle enzyme exfoliation, lymphatic facial massage, and nutrient-rich green tea hydration mask for visibly refreshed skin.",
    price: 95,
    duration: 60,
    image: "/images/services/facial-skincare.jpg",
    status: "active" as const,
  },
  {
    serviceName: "Soft Editorial Event Makeup",
    category: "Makeup",
    description:
      "Breathable, camera-ready complexion work and softly sculpted eyes customized for weddings, portraits, or evening occasions.",
    price: 110,
    duration: 75,
    image: "/images/services/makeup.jpg",
    status: "active" as const,
  },
  {
    serviceName: "Botanical Spa Manicure & Pedicure",
    category: "Manicure & Pedicure",
    description:
      "Detailed cuticle care, warm mineral soak, sugar exfoliation, nourishing hand and foot massage, and long-wear polish.",
    price: 75,
    duration: 75,
    image: "/images/services/manicure-pedicure.jpg",
    status: "active" as const,
  },
  {
    serviceName: "Warm Herbal Stone Massage",
    category: "Spa & Massage",
    description:
      "Slow, restorative full-body massage combining heated basalt stones and warm eucalyptus oil to melt away deep tension.",
    price: 120,
    duration: 60,
    image: "/images/services/spa-massage.jpg",
    status: "active" as const,
  },
  {
    serviceName: "Express Silk Press & Trim",
    category: "Haircut & Styling",
    description:
      "Healthy end-trimming and humidity-resistant silk styling designed to leave hair bouncy, sleek, and protected.",
    price: 80,
    duration: 60,
    image: "/images/services/silk-press.jpg",
    status: "active" as const,
  },
];

async function seedAdminUser(env: SeedEnv): Promise<void> {
  const existingAdmin = await User.findOne({ email: env.SEED_ADMIN_EMAIL.toLowerCase() });
  if (existingAdmin) {
    if (existingAdmin.role !== "admin" || existingAdmin.isBlocked) {
      existingAdmin.role = "admin";
      existingAdmin.isBlocked = false;
      await existingAdmin.save();
      console.log(`Updated existing user ${env.SEED_ADMIN_EMAIL} to active admin.`);
    } else {
      console.log(`Admin user ${env.SEED_ADMIN_EMAIL} already exists.`);
    }
    return;
  }

  const client = mongoose.connection.getClient();
  const db = client.db();

  const auth = betterAuth({
    database: mongodbAdapter(db, { client }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    user: {
      modelName: "users",
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "customer", input: false },
        isBlocked: { type: "boolean", required: false, defaultValue: false, input: false },
        phone: { type: "string", required: false },
      },
    },
  });

  await auth.api.signUpEmail({
    body: {
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      password: env.SEED_ADMIN_PASSWORD,
    },
  });

  await User.updateOne(
    { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    { $set: { role: "admin", isBlocked: false, emailVerified: true } }
  );

  console.log(`Seeded admin user: ${env.SEED_ADMIN_EMAIL}`);
}

async function seedServices(): Promise<void> {
  for (const item of SAMPLE_SERVICES) {
    await Service.updateOne(
      { serviceName: item.serviceName },
      { $setOnInsert: item },
      { upsert: true }
    );
  }
  const activeCount = await Service.countDocuments({ status: "active" });
  console.log(`Services ready (${activeCount} active services in database).`);
}

async function runSeed(): Promise<void> {
  const env = getSeedEnv();
  await connectDB();

  try {
    await seedAdminUser(env);
    await seedServices();
    console.log("Database seed completed successfully.");
  } finally {
    await disconnectDB();
  }
}

runSeed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
