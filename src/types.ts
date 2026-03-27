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