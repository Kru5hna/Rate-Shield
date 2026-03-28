import { TokenBucket } from "../core/tokenBucket.js";

import type { TokenBucketStorage } from "../types.js";

export interface RateLimitOptions {
   tokens: number;
   refillRate: number;
   capacity: number;
   storage: TokenBucketStorage;
}

export function rateLimit(opts: RateLimitOptions) {
   const limiter = new TokenBucket(opts.tokens, opts.refillRate, opts.capacity, opts.storage);
   return (req: any, res:any, next:any) => {
      const key = req.ip;
      const result = limiter.consume(key);

      if(result.allowed) {
         res.set("X-RateLimit-Limit", result.limit);
         res.set("X-RateLimit-Remaining", result.remaining);
         next();
      } else {
         res.status(429).set({
            "X-RateLimit-Limit": result.limit,
            "X-RateLimit-Remaining": 0,
            "Retry-After": Math.ceil(result.retryAfterMs / 1000),
         }).send("Too Many Requests");
      }
   }
}