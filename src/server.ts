import { createApp, getBootEnv } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";

async function startServer(): Promise<void> {
  const env = getBootEnv();
  await connectDB();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`SalonBook API server listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

startServer().catch((err) => {
  console.error("Failed to start SalonBook API server:", err);
  process.exit(1);
});
