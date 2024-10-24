import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const redis = new Redis(process.env.UPSTASH_REDIS_URL);

// Listen for connection event
redis.on("connect", () => {
  console.log("Connected to Redis successfully!");
});

// Listen for error event
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});
