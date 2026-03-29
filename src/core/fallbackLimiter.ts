import type { RateLimitResult, RateLimiter } from "../types.js";

export interface FallbackLimiterConfig {
   timeoutMs?: number;
   circuitBreakerErrors?: number;
   circuitBreakerCooldownMs?: number;
   onError?: (error: Error, isCircuitTripped: boolean) => void;
}

export class FallbackLimiter implements RateLimiter {
   private consecutiveErrors = 0;
   private circuitTrippedUntil = 0;

   private timeoutMs: number;
   private circuitBreakerErrors: number;
   private circuitBreakerCooldownMs: number;
   private onError?: (error: Error, isCircuitTripped: boolean) => void;

   constructor(
      private primary: RateLimiter,
      private secondary: RateLimiter,
      config: FallbackLimiterConfig = {}
   ) {
      this.timeoutMs = config.timeoutMs ?? 50;
      this.circuitBreakerErrors = config.circuitBreakerErrors ?? 3;
      this.circuitBreakerCooldownMs = config.circuitBreakerCooldownMs ?? 10000;
      if (config.onError) {
         this.onError = config.onError;
      }
   }

   async consume(key: string, amount: number = 1): Promise<RateLimitResult> {
      const now = Date.now();

      if (this.circuitTrippedUntil > now) {
         return this.secondary.consume(key, amount);
      }


      try {
         const result = await Promise.race([
            this.primary.consume(key, amount),
            new Promise<never>((_, reject) => 
               setTimeout(() => reject(new Error(`Primary limiter timeout (${this.timeoutMs}ms)`)), this.timeoutMs)
            )
         ]);

         this.consecutiveErrors = 0;
         return result;

      } catch (error) {
         this.consecutiveErrors++;
         
         let isTripped = false;

         if (this.consecutiveErrors >= this.circuitBreakerErrors) {
            isTripped = true;
            this.circuitTrippedUntil = Date.now() + this.circuitBreakerCooldownMs;
         }

         if (this.onError) {
            this.onError(error instanceof Error ? error : new Error(String(error)), isTripped);
         }

         return this.secondary.consume(key, amount);
      }
   }
}
