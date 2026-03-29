import { expect, test, describe, beforeAll, afterAll, afterEach } from "vitest";
import { Redis } from "ioredis";

import { SlidingWindow } from "../src/core/slidingWindow.js";
import { SlidingWindowMemoryStore } from "../src/storage/memoryStore.js";

import { SlidingWindowRedis } from "../src/redis/atomicLimiter.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Unit / Sliding Window (Memory)", () => {
   test("should rate limit and clear old timestamps", async () => {
      const store = new SlidingWindowMemoryStore();
      
      const limiter = new SlidingWindow(2, 1000, store); 

      const req1 = await limiter.consume("user_sw");
      expect(req1.allowed).toBe(true);
      expect(req1.remaining).toBe(1);

      const req2 = await limiter.consume("user_sw");
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      const req3 = await limiter.consume("user_sw");
      expect(req3.allowed).toBe(false);

      await sleep(1100);

      const req4 = await limiter.consume("user_sw");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(1);
   });
});

describe("Integration / Sliding Window (Redis Atomic)", () => {
   let redis: Redis;

   beforeAll(() => {
      redis = new Redis();
   });

   afterEach(async () => {
      const keys = await redis.keys("test:rl:sliding:*");
      if (keys.length > 0) {
         await redis.del(...keys);
      }
   });

   afterAll(async () => {
      await redis.quit();
   });

   test("should rate limit and clear old scores in Redis sorted sets", async () => {
      const limiter = new SlidingWindowRedis(redis, 2, 1000, "test:rl:sliding:");

      await limiter.consume("user1");
      const req2 = await limiter.consume("user1");
      expect(req2.allowed).toBe(true);

      const req3 = await limiter.consume("user1");
      expect(req3.allowed).toBe(false);
      expect(req3.retryAfterMs).toBeGreaterThan(0);

      await sleep(1100);

      const req4 = await limiter.consume("user1");
      expect(req4.allowed).toBe(true);
      expect(req4.remaining).toBe(1);
   });
});
