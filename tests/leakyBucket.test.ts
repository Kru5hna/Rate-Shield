import { expect, test, describe, beforeAll, afterAll, afterEach } from "vitest";
import { Redis } from "ioredis";

import { LeakyBucket } from "../src/core/leakyBucket.js";
import { LeakyBucketMemoryStore } from "../src/storage/memoryStore.js";
import { LeakyBucketRedis } from "../src/redis/atomicLimiter.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Unit / Leaky Bucket (Memory)", () => {
   test("should rate limit and leak water over time", async () => {
      const store = new LeakyBucketMemoryStore();
      const limiter = new LeakyBucket(2, 1, store); 

      const req1 = await limiter.consume("user_lb");
      expect(req1.allowed).toBe(true);
      expect(req1.remaining).toBe(1);

      const req2 = await limiter.consume("user_lb");
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      const req3 = await limiter.consume("user_lb");
      expect(req3.allowed).toBe(false);

      await sleep(1100);

      const req4 = await limiter.consume("user_lb");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(0); 
   });
});

describe("Integration / Leaky Bucket (Redis Atomic)", () => {
   let redis: Redis;

   beforeAll(() => {
      redis = new Redis();
   });

   afterEach(async () => {
      const keys = await redis.keys("test:rl:leaky:*");
      if (keys.length > 0) {
         await redis.del(...keys);
      }
   });

   afterAll(async () => {
      await redis.quit();
   });

   test("should rate limit and leak water over time in Redis", async () => {
      const limiter = new LeakyBucketRedis(redis, 2, 1, "test:rl:leaky:");

      await limiter.consume("user1");
      const req2 = await limiter.consume("user1");
      expect(req2.allowed).toBe(true);

      const req3 = await limiter.consume("user1");
      expect(req3.allowed).toBe(false);
      expect(req3.retryAfterMs).toBeGreaterThan(0);

      await sleep(1100);

      const req4 = await limiter.consume("user1");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(0);
   });
});
