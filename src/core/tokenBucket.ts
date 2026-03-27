import type { TokenBucketStorage } from "../types.js";

export class TokenBucket {
   constructor(
      private tokens: number,
      private refillRate: number,
      private capacity: number,
      private storage: TokenBucketStorage
   ) {}

   consume(key: string, amount: number = 1): RateLimitResult {
      const state = this.storage.get(key);
      const now = Date.now();
      let currentTokens = state?.tokens ?? this.capacity;
      let lastRefillTime = state?.lastRefillTime ?? now;

      const timeElapsed = now  - lastRefillTime;
      const tokensToAdd = Math.floor((timeElapsed * this.refillRate) / 100);

      currentTokens = Math.min(this.capacity, currentTokens + tokensToAdd);

      if(currentTokens < amount) {
         const tokensNeeded = amount - currentTokens;
         const timeToRefill = Math.ceil((tokensNeeded / this.refillRate) * 100);

         const ret
      }

      
      return {
         allowed: false,
         remaining: 0,
         retryAfterMs: 0,
         limit: this.capacity,
      }
   }
}