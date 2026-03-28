import type { FixedWindowState, LeakyBucketState, LeakyBucketStorage, SlidingWindowState, SlidingWindowStorage, Storage, TokenBucketState, TokenBucketStorage } from "../types.js";

export class MemoryStore implements Storage {
  private store: Map<string, FixedWindowState> = new Map();

  get(key: string) {
    return this.store.get(key) ?? null;
  }
  set(key: string, value: FixedWindowState) {
    this.store.set(key, value);
  }
  delete(key: string) {
    this.store.delete(key);
  }
}

export class SlidingWindowMemoryStore implements SlidingWindowStorage {
  private store: Map<string, SlidingWindowState> = new Map();

  get(key: string) {
    return this.store.get(key) ?? null;
  }
  set(key: string, value: SlidingWindowState) {
    this.store.set(key, value);
  }
  delete(key: string) {
    this.store.delete(key);
  }
}

export class TokenBucketMemoryStore implements TokenBucketStorage {
  private store: Map<string, TokenBucketState> = new Map();

  get(key: string) {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: TokenBucketState) {
    return this.store.set(key, value);
  }

  delete(key: string) {
    return this.store.delete(key);
  }
}

export class LeakyBucketMemoryStore  implements LeakyBucketStorage {
  private store: Map<string, LeakyBucketState> = new Map();

  get(key: string) {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: LeakyBucketState) {
    return this.store.set(key, value);
  }

  delete(key: string) {
    return this.store.delete(key);
  }
}