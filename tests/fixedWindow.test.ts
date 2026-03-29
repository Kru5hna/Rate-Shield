import { expect, test, describe, beforeAll, afterAll, afterEach } from "vitest";
import { Redis } from "ioredis";

// Unit test imports (Memory)
import { FixedWindow } from "../src/core/fixedWindow.js";
import { MemoryStore } from "../src/storage/memoryStore.js";

// Integration test imports (Redis)
import { FixedWindowRedis } from "../src/redis/atomicLimiter.js";

describe("Unit / Fixed Window (Memory)", () => {
   test("should rate limit properly within memory", async () => {
      const store = new MemoryStore();
      const limiter = new FixedWindow(2, 60000, store); 

      const req1 = await limiter.consume("userX");
      expect(req1.allowed).toBe(true);
      expect(req1.remaining).toBe(1);

      const req2 = await limiter.consume("userX");
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      const req3 = await limiter.consume("userX");
      expect(req3.allowed).toBe(false);
      expect(req3.retryAfterMs).toBeGreaterThan(0);
   });
});

describe("Integration / Fixed Window (Redis)", () => {
   let redis: Redis;

   beforeAll(() => {
      redis = new Redis(); 
   });

   afterEach(async () => {
      // Clean test keys after EACH test block
      const keys = await redis.keys("test:rl:*");
      if (keys.length > 0) {
         await redis.del(...keys);
      }
   });

   afterAll(async () => {
      // Very Important: Close Redis connection or 'npm run test' hangs forever
      await redis.quit();
   });

   test("should rate limit properly using Redis atomic operations", async () => {
      
      const limiter = new FixedWindowRedis(redis, 2, 60000, "test:rl:fixed:");

      const r1 = await limiter.consume("userX");
      expect(r1.allowed).toBe(true);
      
      const r2 = await limiter.consume("userX");
      expect(r2.allowed).toBe(true);

      const r3 = await limiter.consume("userX");
      expect(r3.allowed).toBe(false); 
   });
});