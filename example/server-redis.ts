import express from "express";
import { Redis } from "ioredis";
import { rateLimit } from "../src/middleware/express.js";
import { FixedWindowRedis } from "../src/redis/atomicLimiter.js";

const app = express();
const port = 3000;

// 1. Connect to Redis (defaults to localhost:6379)
console.log("Attempting to connect to Redis...");
const redisClient = new Redis();

// Add connection event listeners to know if Redis is actually running
redisClient.on("connect", () => {
  console.log("✅ Successfully connected to Redis!");
});

redisClient.on("error", (err: any) => {
  console.error(
    "❌ Redis Connection Error (Is your Redis server running?):",
    err.message,
  );
});

// 5 requests per 30 seconds
const apiLimiter = new FixedWindowRedis(redisClient, 5, 30000);

app.use(
  "/api",
  rateLimit({
    limiter: apiLimiter,
    statusCode: 429,
    errorMessage: "Hold on! You are sending too many requests.",
    keyGenerator: (req) => req.ip || "unknown",
  }),
);

app.get("/api/data", (req, res) => {
  res.json({ message: "Success! You hit the Redis-protected route." });
});

app.listen(port, () => {
  console.log(`\n🚀 Redis Test server running at http://localhost:${port}`);
  console.log(`\n HOW TO TEST `);
  console.log(`Make sure you have Redis running in the background!`);
  console.log(
    `If you don't have Redis: You can use Docker: docker run -p 6379:6379 -d redis`,
  );
  console.log(`\n1. Single Request test:`);
  console.log(`   curl http://localhost:${port}/api/data`);
  console.log(`\n2. Stress Test (Autocannon - 100 requests):`);
  console.log(
    `   npx autocannon -c 10 -a 100 http://localhost:${port}/api/data`,
  );
});
