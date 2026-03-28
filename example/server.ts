import express from "express";
import { rateLimit } from "../src/middleware/express.js";
import { TokenBucket } from "../src/core/tokenBucket.js";
import { TokenBucketMemoryStore } from "../src/storage/memoryStore.js";

const app = express();
const port = 3000;

// 1. Create the Rate Limiter
// Allowed: 5 requests. Refills at 1 request per second. Max capacity: 5.
const store = new TokenBucketMemoryStore();
const apiLimiter = new TokenBucket(5, 1, 5, store); 

// 2. Attach the middleware to all /api routes
app.use(
  "/api",
  rateLimit({
    limiter: apiLimiter,
    statusCode: 429,
    errorMessage: "Hold on! You are sending too many requests.",
    keyGenerator: (req) => req.ip || "unknown",
  })
);

// 3. Define the protected route
app.get("/api/data", (req, res) => {
  res.json({ message: "Success! You have enough tokens to see this data." });
});

// A public route for comparison
app.get("/public", (req, res) => {
  res.json({ message: "This route is fully public. Rate limit does not apply." });
});

// 4. Start the server
app.listen(port, () => {
  console.log(`\n🚀 Example server running at http://localhost:${port}`);
  console.log(`\n------- HOW TO TEST -------`);
  console.log(`Load up your terminal and run these commands to test your package:`);
  console.log(`\n1. Single Request test:`);
  console.log(`   curl http://localhost:${port}/api/data`);
  console.log(`\n2. Stress Test (Autocannon - 100 requests):`);
  console.log(`   npx autocannon -c 10 -a 100 http://localhost:${port}/api/data`);
});
