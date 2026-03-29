import { expect, test, describe, beforeAll, afterAll, afterEach } from "vitest";
import { Redis } from "ioredis";

// Unit test imports (Memory)
import { TokenBucket } from "../src/core/tokenBucket.js";
import { TokenBucketMemoryStore } from "../src/storage/memoryStore.js";

// Integration test imports (Redis)
import { TokenBucketRedis } from "../src/redis/atomicLimiter.js";

// A small helper to simulate waiting in tests
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ───────────────────────────────────────────
//  UNIT TEST (In-Memory)
// ───────────────────────────────────────────
describe("Unit / Token Bucket (Memory)", () => {
   test("should rate limit properly and refill tokens over time", async () => {
      const store = new TokenBucketMemoryStore();
      
      // tokens: 2, refillRate: 1 token/sec, capacity: 2
      const limiter = new TokenBucket(2, 1, 2, store); 

      // Consume first 2 tokens (Should succeed)
      const req1 = await limiter.consume("user_tb");
      expect(req1.allowed).toBe(true);
      expect(req1.remaining).toBe(1);

      const req2 = await limiter.consume("user_tb");
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      // Consume 3rd token immediately (Should be blocked, bucket is empty)
      const req3 = await limiter.consume("user_tb");
      expect(req3.allowed).toBe(false);
      expect(req3.retryAfterMs).toBeGreaterThan(0);

      // Wait 1.1 seconds for a token to refill
      await sleep(1100);

      // Consume 4th token (Should succeed now since 1 token refilled)
      const req4 = await limiter.consume("user_tb");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(0); // 1 token was there, we took it
   });
});

// ───────────────────────────────────────────
//  INTEGRATION TEST (Redis)
// ───────────────────────────────────────────
describe("Integration / Token Bucket (Redis Atomic)", () => {
   let redis: Redis;

   beforeAll(() => {
      redis = new Redis();
   });

   afterEach(async () => {
      // Clean test keys ONLY
      const keys = await redis.keys("test:rl:token:*");
      if (keys.length > 0) {
         await redis.del(...keys);
      }
   });

   afterAll(async () => {
      await redis.quit();
   });

   test("should rate limit properly and refill tokens over time in Redis", async () => {
      // capacity: 2, refillRate: 1 token/sec
      const limiter = new TokenBucketRedis(redis, 2, 1, "test:rl:token:");

      // Consume first 2 tokens
      const req1 = await limiter.consume("userX");
      expect(req1.allowed).toBe(true);
      
      const req2 = await limiter.consume("userX");
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      // 3rd token immediately (Blocked)
      const req3 = await limiter.consume("userX");
      expect(req3.allowed).toBe(false);
      expect(req3.retryAfterMs).toBeGreaterThan(0);

      // Wait 1.1 seconds for 1 token to refill in Redis
      await sleep(1100);

      // 4th token (Succeeds)
      const req4 = await limiter.consume("userX");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(0);
   });
});