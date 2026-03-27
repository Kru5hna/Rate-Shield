import type { RateLimitResult, Storage } from "../types.js";

export class FixedWindow {
  constructor(
    private limit: number,
    private windowMs: number,
    private storage: Storage,
  ) {}

  consume(key: string): RateLimitResult {
    const now = Date.now();
    const state = this.storage.get(key);

    if (!state) {
      this.storage.set(key, {
        count: 1,
        windowStart: now,
      });

      return {
        allowed: true,
        remaining: this.limit - 1,
        retryAfterMs: 0,
        limit: this.limit,
      };
    }

    const elapsed = now - state.windowStart;

    if (elapsed >= this.windowMs) {
      this.storage.set(key, {
        count: 1,
        windowStart: now,
      });

      return {
        allowed: true,
        remaining: this.limit - 1,
        retryAfterMs: 0,
        limit: this.limit,
      };
    }

    const newCount = state.count + 1;
    if (newCount > this.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: this.windowMs - elapsed,
        limit: this.limit,
      };
    }
    this.storage.set(key, {
      count: newCount,
      windowStart: state.windowStart,
    });

    return {
      allowed: true,
      remaining: this.limit - newCount,
      retryAfterMs: 0,
      limit: this.limit,
    };
  }
}
