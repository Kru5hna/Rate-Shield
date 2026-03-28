import type { Redis } from "ioredis";
import type { Storage, SlidingWindowStorage, TokenBucketStorage, LeakyBucketStorage, FixedWindowState, SlidingWindowState, TokenBucketState, LeakyBucketState } from "../types.js";

export class FixedWindowRedisStore implements Storage {
  constructor(
    private redis: Redis,
    private prefix: string = "rl:fixed:"
  ) {}

  async get(key: string) : Promise<FixedWindowState | null> {
    const value = await this.redis.get(this.prefix + key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: FixedWindowState) : Promise<void> {
    await this.redis.set(this.prefix + key, JSON.stringify(value));
  }

  async delete(key: string) : Promise<void> {
    await this.redis.del(this.prefix + key);
  }

}

export class SlidingWindowRedisStore implements SlidingWindowStorage {
  constructor(
    private redis: Redis,
    private prefix: string = "rl:sliding:"
  ) {}

  async get(key: string) : Promise<SlidingWindowState | null> {
    const value = await this.redis.get(this.prefix + key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: SlidingWindowState) : Promise<void> {
    await this.redis.set(this.prefix + key, JSON.stringify(value));
  }

  async delete(key: string) : Promise<void> {
    await this.redis.del(this.prefix + key);
  }

}

export class TokenBucketRedisStore implements TokenBucketStorage {
  constructor(
    private redis: Redis,
    private prefix: string = "rl:token:"
  ) {}

  async get(key: string) : Promise<TokenBucketState | null> {
    const value = await this.redis.get(this.prefix + key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: TokenBucketState) : Promise<void> {
    await this.redis.set(this.prefix + key, JSON.stringify(value));
  }

  async delete(key: string) : Promise<void> {
    await this.redis.del(this.prefix + key);
  }

}

export class LeakyBucketRedisStore implements LeakyBucketStorage {
  constructor(
    private redis: Redis,
    private prefix: string = "rl:leaky:"
  ) {}

  async get(key: string) : Promise<LeakyBucketState | null> {
    const value = await this.redis.get(this.prefix + key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: LeakyBucketState) : Promise<void> {
    await this.redis.set(this.prefix + key, JSON.stringify(value));
  }

  async delete(key: string) : Promise<void> {
    await this.redis.del(this.prefix + key);
  }

}
