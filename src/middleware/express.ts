// import { TokenBucket } from "../core/tokenBucket.js";

import type { RateLimiter, TokenBucketStorage } from "../types.js";

export interface RateLimitOptions {
   limiter : RateLimiter;
   keyGenerator?: (req:any) => string;
   errorMessage?: string;
   statusCode?:number;
}

export function rateLimit(opts: RateLimitOptions) {
   return async (req: any, res: any, next: any) => {
      try {
         // Generate the key (default to IP)
         const key = opts.keyGenerator ? opts.keyGenerator(req) : req.ip;

         // Consume using the provided limiter
         const result = await opts.limiter.consume(key);

         if (result.allowed) {
            res.set("X-RateLimit-Limit", result.limit);
            res.set("X-RateLimit-Remaining", result.remaining);
            next();
         } else {
            res.status(opts.statusCode || 429).set({
               "X-RateLimit-Limit": result.limit,
               "X-RateLimit-Remaining": 0,
               "Retry-After": Math.ceil(result.retryAfterMs / 1000),
            }).send(opts.errorMessage || "Too Many Requests");
         }
      } catch (error) {
         next(error);
      }
   }
}