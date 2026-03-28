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
   get(key: string): FixedWindowState  | null;
   set(key: string, value: FixedWindowState) : void;
   delete(key: string) : void;

}

// Sliding window
export interface SlidingWindowState {
   timestamps: number[],
}

export interface SlidingWindowStorage {
   get(key: string) : SlidingWindowState | null;
   set(key: string, value: SlidingWindowState) : void;
   delete(key: string) : void;
}

// Token Bucket...
export interface TokenBucketState {
   tokens: number,
   lastRefillTime: number,
}

export interface TokenBucketStorage {
   get(key: string) : TokenBucketState | null;
   set(key: string, value: TokenBucketState) : void;
   delete(key: string) : void;
}

// Leaky Buckettttt

export interface LeakyBucketState {
   waterLevel: number,
   lastLeakTime: number,
}

export interface LeakyBucketStorage {
   get(key: string) : LeakyBucketState | null;
   set(key: string, value: LeakyBucketState): void;
   delete(key: string) : void;
}