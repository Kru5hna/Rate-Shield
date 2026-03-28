import type { RateLimitResult, TokenBucketStorage } from "../types.js";

export class TokenBucket {
   constructor(
      private tokens: number,
      private refillRate: number,
      private capacity: number,
      private storage: TokenBucketStorage
   ) {}

   async consume(key: string, amount: number = 1): Promise<RateLimitResult> {
      const state = await this.storage.get(key);
      const now = Date.now();
      let currentTokens = state?.tokens ?? this.capacity;
      let lastRefillTime = state?.lastRefillTime ?? now;

      const timeElapsed = now  - lastRefillTime;
      const tokensToAdd = Math.floor((timeElapsed * this.refillRate) / 1000);

      currentTokens = Math.min(this.capacity, currentTokens + tokensToAdd);

      if(currentTokens < amount) {
         const tokensNeeded = amount - currentTokens;
         const timeToRefill = Math.ceil((tokensNeeded / this.refillRate) * 1000);

          return {
            allowed: false,
            remaining: 0,
            retryAfterMs:timeToRefill,
            limit: this.capacity,

         }
      }
      currentTokens -= amount;
      await this.storage.set(key, {tokens: currentTokens, lastRefillTime: now});


      
      return {
         allowed: true,
         remaining: currentTokens,
         retryAfterMs: 0,
         limit: this.capacity,
      }
   }
}