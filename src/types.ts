export interface RateLimitResult {
   allowed : boolean,
   remaining: number,
   retryAfterMs: number,
   limit: number, 
}

export interface FixedWindowState  {
   count: number, 
   windowStart: number,
}

export interface Storage {
   get(key: string): Promise<FixedWindowState | null>;
   set(key: string, value: FixedWindowState) : Promise<void>;
   delete(key: string) : Promise<void>;
}

// Sliding window
export interface SlidingWindowState {
   timestamps: number[],
}

export interface SlidingWindowStorage {
   get(key: string) : Promise<SlidingWindowState | null>;
   set(key: string, value: SlidingWindowState) : Promise<void>;
   delete(key: string) : Promise<void>;
}

// Token Bucket...
export interface TokenBucketState {
   tokens: number,
   lastRefillTime: number,
}

export interface TokenBucketStorage {
   get(key: string) : Promise<TokenBucketState | null>;
   set(key: string, value: TokenBucketState) : Promise<void>;
   delete(key: string) : Promise<void>;
}

// Leaky Buckettttt

export interface LeakyBucketState {
   waterLevel: number,
   lastLeakTime: number,
}

export interface LeakyBucketStorage {
   get(key: string) : Promise<LeakyBucketState | null>;
   set(key: string, value: LeakyBucketState): Promise<void>;
   delete(key: string) : Promise<void>;
}

export interface RateLimiter {
   consume(key: string, amount?: number) : Promise<RateLimitResult>;
}