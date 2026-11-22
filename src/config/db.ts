import mongoose from "mongoose";
import { getEnv } from "./env.js";

let isConnected = false;

/**
 * Connects to MongoDB via Mongoose and synchronizes schema indexes.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const { MONGODB_URI } = getEnv();

  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  isConnected = true;
  return conn;
}

/**
 * Gracefully closes the active Mongoose connection.
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
