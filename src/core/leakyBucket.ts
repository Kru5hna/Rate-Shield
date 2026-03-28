import type { LeakyBucketStorage, RateLimitResult } from "../types.js";

export class LeakyBucket {
   private capacity: number;
   private leakRate: number;
   private storage: LeakyBucketStorage;

   constructor(capacity: number, leakRate: number, storage: LeakyBucketStorage) {
      this.capacity = capacity;
      this.leakRate = leakRate;
      this.storage = storage;
   }

   async consume(key: string, amount: number=1) : Promise<RateLimitResult> {
      const now = Date.now();
      const state = await this.storage.get(key);
      
      let waterLevel = state?.waterLevel ??  0;
      let lastLeakTime = state?.lastLeakTime ?? now;

      const elapsed = now - lastLeakTime;
      const leaked = Math.floor((elapsed * this.leakRate) / 1000);
      
      waterLevel = Math.max(0, waterLevel - leaked);

      if(waterLevel + amount > this.capacity) {
         const overflow = waterLevel + amount - this.capacity;
         const retryAfterMs = Math.ceil((overflow / this.leakRate) * 1000);

         return {
            allowed: false,
            remaining: 0,
            retryAfterMs,
            limit: this.capacity,
         }
      }
      waterLevel += amount;
      await this.storage.set(key, {waterLevel, lastLeakTime: now});

      return {
         allowed: true,
         remaining: Math.floor(this.capacity- waterLevel),
         retryAfterMs: 0,
         limit: this.capacity,
      }
   }
   
}