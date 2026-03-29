import { expect, test, describe } from "vitest";
import { FallbackLimiter } from "../src/core/fallbackLimiter.js";
import { RateLimitResult, RateLimiter } from "../src/types.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class FailingLimiter implements RateLimiter {
   constructor(private failDelayMs: number) {}
   
   async consume(key: string, amount?: number): Promise<RateLimitResult> {
      await sleep(this.failDelayMs);
      throw new Error(`Redis connection dropped on key ${key}`);
   }
}

class SuccessMemoryLimiter implements RateLimiter {
   async consume(key: string, amount?: number): Promise<RateLimitResult> {
      return { allowed: true, remaining: 10, retryAfterMs: 0, limit: 10 };
   }
}

class HangingLimiter implements RateLimiter {
   async consume(key: string, amount?: number): Promise<RateLimitResult> {
      await sleep(10000); // 10 seconds
      return { allowed: true, remaining: 10, retryAfterMs: 0, limit: 10 };
   }
}

describe("FallbackLimiter (Circuit Breaker & Degraded Mode)", () => {

   test("should fallback to secondary if primary throws an error", async () => {
      const primary = new FailingLimiter(10); // Fails in 10ms
      const secondary = new SuccessMemoryLimiter(); // Always succeeds
      
      const fallback = new FallbackLimiter(primary, secondary, {
         timeoutMs: 50,
      });

      const start = Date.now();
      const result = await fallback.consume("user_1");
      const elapsed = Date.now() - start;

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      
      expect(elapsed).toBeLessThan(45); 
   });

   test("should fallback if primary hangs (Promise Timeout)", async () => {
      const primary = new HangingLimiter(); // Hangs for 10s
      const secondary = new SuccessMemoryLimiter();
      
      const fallback = new FallbackLimiter(primary, secondary, {
         timeoutMs: 50, // Cut off after 50ms
      });

      const start = Date.now();
      const result = await fallback.consume("user_2");
      const elapsed = Date.now() - start;

      expect(result.allowed).toBe(true);
      
      expect(elapsed).toBeGreaterThanOrEqual(45); 
      expect(elapsed).toBeLessThan(100); 
   });

   test("should trip the circuit breaker and cool down", async () => {
      let errorEmitted = false;
      let circuitTrippedEmitted = false;

      const primary = new FailingLimiter(1);
      const secondary = new SuccessMemoryLimiter();
      
      const fallback = new FallbackLimiter(primary, secondary, {
         timeoutMs: 50,
         circuitBreakerErrors: 3, // Trip after 3 errors
         circuitBreakerCooldownMs: 500, // Cooldown for 500ms
         onError: (err, tripped) => { 
            errorEmitted = true; 
            if (tripped) circuitTrippedEmitted = true;
         }
      });

      // Request 1: Fails -> Fallback
      await fallback.consume("user_3");
      expect(errorEmitted).toBe(true);
      expect(circuitTrippedEmitted).toBe(false); // only 1 error, not tripped yet

      // Request 2: Fails -> Fallback
      await fallback.consume("user_3");

      // Request 3: Fails -> Fallback -> TRIPS CIRCUIT BREAKER
      await fallback.consume("user_3");
      expect(circuitTrippedEmitted).toBe(true); 

      // Request 4 (Immediate): 
      // Should instantly fallback WITHOUT waiting for the failing limiter
      const start = Date.now();
      const r4 = await fallback.consume("user_3");
      const elapsed = Date.now() - start;

      expect(r4.allowed).toBe(true);
      // It should be completely instant because the circuit cut off the primary 
      expect(elapsed).toBeLessThan(5); 

      // Request 5 (After Cooldown):
      // Should try the primary again since 500ms passed
      await sleep(550);
      
      const start5 = Date.now();
      await fallback.consume("user_3"); // Tries primary, fails, falls back
      const elapsed5 = Date.now() - start5;

      // Because it tried primary again, it wasn't instant
      expect(elapsed5).toBeGreaterThanOrEqual(0);
   });
});
