import type {Redis} from "ioredis";
import type { RateLimitResult } from "../types.js";

export class AtomicRedisLimiter {
   constructor(
      private redis: Redis,
      private limit: number,
      private windowMs: number,
      private prefix: string = "rl:atomic:"
   ) {}

   async consume(key: string) : Promise<RateLimitResult> {
      const script = `
      local limit = tonumber(ARGV[1])
      local windowMs = tonumber(ARGV[2])

      local current = redis.call("GET", KEYS[1])
      if current == false then
         redis.call("SET", KEYS[1], 1, "PX", windowMs)
         return {1, limit - 1, 0, limit}
      end

      local count = tonumber(current) + 1
      if count > limit then
         local ttl = redis.call("PTTL", KEYS[1])
         return {0, 0, ttl, limit}
      end

      redis.call("INCR", KEYS[1])
      return {1, limit - count, 0, limit}
      `

      const result = await this.redis.eval(script, 1, this.prefix + key, this.limit, this.windowMs) as number[];

      return {
         allowed: result[0] === 1,
         remaining: result[1]!,
         retryAfterMs: result[2]!,
         limit: result[3]!,
      }
   }

}