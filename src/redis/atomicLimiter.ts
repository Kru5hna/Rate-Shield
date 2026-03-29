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

export class TokenBucketRedis {
   constructor(
      private redis: Redis,
      private capacity: number,
      private refillRate: number,
      private prefix: string = "rl:token:"
   ) {}

   async consume(key: string, amount: number = 1): Promise<RateLimitResult> {
      const script = `
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local amount = tonumber(ARGV[4])

      local data = redis.call("GET", KEYS[1])
      local tokens = capacity
      local lastRefillTime = now

      if data then
         local sep = string.find(data, ":")
         tokens = tonumber(string.sub(data, 1, sep - 1))
         lastRefillTime = tonumber(string.sub(data, sep + 1))
      end

      -- Refill tokens based on elapsed time
      local elapsed = now - lastRefillTime
      local tokensToAdd = math.floor((elapsed * refillRate) / 1000)
      tokens = math.min(capacity, tokens + tokensToAdd)

      -- Not enough tokens
      if tokens < amount then
         local needed = amount - tokens
         local retryMs = math.ceil((needed / refillRate) * 1000)
         return {0, 0, retryMs, capacity}
      end

      -- Consume tokens and save
      tokens = tokens - amount
      redis.call("SET", KEYS[1], tokens .. ":" .. now)
      return {1, tokens, 0, capacity}
      `

      const result = await this.redis.eval(
         script, 1, this.prefix + key,
         this.capacity, this.refillRate, Date.now(), amount
      ) as number[];

      return {
         allowed: result[0] === 1,
         remaining: result[1]!,
         retryAfterMs: result[2]!,
         limit: result[3]!,
      }
   }
}