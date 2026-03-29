import { expect, test, describe, beforeAll, afterAll, afterEach } from "vitest";
import { Redis } from "ioredis";

// Unit test imports (Memory)
import { TokenBucket } from "../src/core/tokenBucket.js";
import { TokenBucketMemoryStore } from "../src/storage/memoryStore.js";

// Integration test imports (Redis)
import { TokenBucketRedis } from "../src/redis/atomicLimiter.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Unit / Token Bucket (Memory)", () => {
   test("should rate limit properly and refill tokens over time", async () => {
      const store = new TokenBucketMemoryStore();
      
      const limiter = new TokenBucket(2, 1, 2, store); 

      const req1 = await limiter.consume("user_tb");
      expect(req1.allowed).toBe(true);
      expect(req1.remaining).toBe(1);

      const req2 = await limiter.consume("user_tb");
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      const req3 = await limiter.consume("user_tb");
      expect(req3.allowed).toBe(false);
      expect(req3.retryAfterMs).toBeGreaterThan(0);

      await sleep(1100);

      const req4 = await limiter.consume("user_tb");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(0); 
   });
});

describe("Integration / Token Bucket (Redis Atomic)", () => {
   let redis: Redis;

   beforeAll(() => {
      redis = new Redis();
   });

   afterEach(async () => {
      const keys = await redis.keys("test:rl:token:*");
      if (keys.length > 0) {
         await redis.del(...keys);
      }
   });

   afterAll(async () => {
      await redis.quit();
   });

   test("should rate limit properly and refill tokens over time in Redis", async () => {
      const limiter = new TokenBucketRedis(redis, 2, 1, "test:rl:token:");

      const req1 = await limiter.consume("userX");
      expect(req1.allowed).toBe(true);
      
      const req2 = await limiter.consume("userX");
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      const req3 = await limiter.consume("userX");
      expect(req3.allowed).toBe(false);
      expect(req3.retryAfterMs).toBeGreaterThan(0);

      await sleep(1100);

      const req4 = await limiter.consume("userX");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(0);
   });
});