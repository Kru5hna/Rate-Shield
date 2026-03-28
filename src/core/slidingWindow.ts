import type { RateLimitResult, SlidingWindowStorage } from "../types.js";

export class SlidingWindow {
   constructor(
      private limit: number,
      private windowMs: number,
      private storage: SlidingWindowStorage
   ) {}

   async consume(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = now - this.windowMs;

    const state = await this.storage.get(key);
    const timestamps = state?.timestamps || [];
    const validTimestamps = timestamps.filter((ts) => ts >= windowStart);

    if(validTimestamps.length >= this.limit) {
      const oldestTimestamp = validTimestamps[0]!;
      const retryAfterMs = oldestTimestamp + this.windowMs - now;
      return {
         allowed: false, 
         remaining: 0,
         retryAfterMs,
         limit: this.limit,
      }

    }

    const newTimestamps = [... validTimestamps, now];
    await this.storage.set(key, { timestamps: newTimestamps });

    return {
      allowed: true,
      remaining: this.limit - newTimestamps.length,
      retryAfterMs: 0,
      limit: this.limit,
    }

    
    
   }
}
