<p align="center">
  <img src="https://img.shields.io/badge/⚡-Rate_Shield-blueviolet?style=for-the-badge&logoColor=white" alt="Rate Shield" />
</p>

<h1 align="center">Rate Shield</h1>

<p align="center">
  <strong>A lightweight, pluggable rate limiter for Node.js — built from scratch.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
  <img src="https://img.shields.io/badge/Status-In_Development-orange?style=flat-square" />
</p>

<p align="center">
  <code>npm install rate-shield</code>
</p>

---

## 🤔 What is this?

A system that answers one question: **"Should I allow or block this request?"**

Rate Shield protects your APIs from abuse by limiting how many requests a client can make in a given time window. It's built with clean architecture, fully typed in TypeScript, and designed to be extended with multiple algorithms.

```
  Request → "192.168.1.1"
      │
      ▼
  Do I know this IP? ──No──► Save count=1, ALLOW ✅
      │
     Yes
      │
      ▼
  Has their window expired? ──Yes──► Reset count=1, ALLOW ✅
      │
      No
      │
      ▼
  Are they over the limit? ──Yes──► BLOCK ❌
      │
      No
      │
      ▼
  Increment count, ALLOW ✅
```

## 🏗️ Architecture

```
src/
├── types.ts              ← Interfaces (RateLimitResult, State types, Storage contracts)
├── storage/
│   └── memoryStore.ts    ← In-memory Map-based stores (pluggable)
├── core/
│   ├── fixedWindow.ts    ← Fixed Window algorithm
│   ├── slidingWindow.ts  ← Sliding Window algorithm
│   ├── tokenBucket.ts    ← Token Bucket algorithm
│   └── leakyBucket.ts    ← Leaky Bucket algorithm
└── index.ts              ← Barrel exports
```

The design is intentionally modular:

| Layer         | Responsibility                                              |
| ------------- | ----------------------------------------------------------- |
| **Types**     | Contracts — what data looks like                            |
| **Storage**   | Persistence — where state is saved (`Map` now, Redis later) |
| **Algorithm** | Logic — the allow/block decision                            |

## ⚡ Quick Start

```typescript
import { FixedWindow, MemoryStore } from "rate-shield";

// Create a store (in-memory)
const store = new MemoryStore();

// Create a limiter: 5 requests per 10 seconds
const limiter = new FixedWindow(5, 10_000, store);

// Check if a request should be allowed
const result = limiter.consume("192.168.1.1");

if (result.allowed) {
  console.log(`✅ Allowed — ${result.remaining} requests remaining`);
} else {
  console.log(`❌ Blocked — retry after ${result.retryAfterMs}ms`);
}
```

## 📦 API Reference

### `FixedWindow`

```typescript
new FixedWindow(limit: number, windowMs: number, storage: Storage)
```

| Param      | Type      | Description                           |
| ---------- | --------- | ------------------------------------- |
| `limit`    | `number`  | Max requests per window               |
| `windowMs` | `number`  | Window duration in milliseconds       |
| `storage`  | `Storage` | Storage backend (e.g., `MemoryStore`) |

#### `.consume(key: string): RateLimitResult`

Checks if a request from the given key should be allowed.

```typescript
interface RateLimitResult {
  allowed: boolean; // allow or block?
  remaining: number; // requests left in this window
  retryAfterMs: number; // ms to wait (0 if allowed)
  limit: number; // the configured max
}
```

### `MemoryStore`

```typescript
new MemoryStore();
```

In-memory storage using a `Map`. Implements the `Storage` interface:

```typescript
interface Storage {
  get(key: string): FixedWindowState | null;
  set(key: string, value: FixedWindowState): void;
  delete(key: string): void;
}
```

> 💡 You can create your own store (e.g., Redis) by implementing this interface.

## 🗺️ Roadmap

- [x] **Fixed Window** — simple counting per time window
- [x] **Sliding Window** — tracks individual timestamps, no boundary burst
- [x] **Token Bucket** — smooth rate limiting with lazy token refill
- [x] **Leaky Bucket** — constant drain rate, smooth output
- [ ] **Express Middleware** — drop-in `app.use(rateLimit({...}))`
- [ ] **Redis Store** — distributed rate limiting across servers
- [ ] **Analytics** — request metrics & dashboard

## 🧠 Algorithm Deep Dive

Each algorithm solves a flaw in the previous one:

```
Fixed Window ──► has boundary burst problem
      │
Sliding Window ──► fixes it by tracking individual timestamps
      │
Token Bucket ──► smoother, allows controlled bursts ✅
      │
Leaky Bucket ──► constant drain rate, like a queue ✅
```

---

### 1. Fixed Window ✅

Divides time into fixed windows. Counter resets when window expires.

```
Window: 12:00 – 12:59  (limit: 5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  12:05 → req #1  ✅ remaining: 4
  12:10 → req #2  ✅ remaining: 3
  12:30 → req #3  ✅ remaining: 2
  12:45 → req #4  ✅ remaining: 1
  12:50 → req #5  ✅ remaining: 0
  12:55 → req #6  ❌ BLOCKED

Window: 1:00 – 1:59  ← counter resets!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1:05  → req #1  ✅ remaining: 4 (fresh!)
```

#### ⚠️ The Boundary Burst Problem

**Double the traffic can pass at window edges:**

```
Limit: 5 req/min

Window 1 (12:00–12:59)       Window 2 (1:00–1:59)
━━━━━━━━━━━━━━━━━━━━━        ━━━━━━━━━━━━━━━━━━━━
  12:55 → req #1 ✅           1:00 → req #1 ✅
  12:56 → req #2 ✅           1:01 → req #2 ✅
  12:57 → req #3 ✅           1:02 → req #3 ✅
  12:58 → req #4 ✅           1:03 → req #4 ✅
  12:59 → req #5 ✅           1:04 → req #5 ✅

= 10 requests in ~10 seconds! (limit was 5/min) 😱
```

Counter resets exactly at the boundary → user exploits the gap.

---

### 2. Sliding Window ✅

Instead of a counter, **store the timestamp of every request** and count how many fall within the last `windowMs` from *right now*.

```
Limit: 5 req per 60 seconds
Current time: 1:02:30

Stored timestamps for "192.168.1.1":
  [ 1:01:50, 1:01:55, 1:02:00, 1:02:10, 1:02:20 ]

Sliding window = last 60s = 1:01:30 → 1:02:30
  1:01:50 ✅ inside
  1:01:55 ✅ inside
  1:02:00 ✅ inside
  1:02:10 ✅ inside
  1:02:20 ✅ inside
Count = 5 → ❌ BLOCKED

Later at 1:02:51 →
  1:01:50 slides OUT (older than 60s)
  Count = 4 → ✅ ALLOWED
```

**No boundary burst!** Window moves with time, not fixed to clock edges.

#### Fixed Window vs Sliding Window

| | Fixed Window | Sliding Window |
|---|---|---|
| **Stores** | `{ count, windowStart }` | `[ timestamp, timestamp, ... ]` |
| **Resets** | At boundary | Never — old timestamps slide out |
| **Boundary burst** | ⚠️ 2x traffic possible | ✅ No |
| **Memory** | Low (2 numbers/key) | Higher (1 timestamp/request) |
| **Use when** | Simplicity is enough | Accuracy matters |

---

### 3. Token Bucket ✅

A bucket holds tokens that **refill at a constant rate**. Each request consumes a token. If the bucket is empty, the request is denied. Tokens are refilled **lazily** — no timers needed.

```
Capacity: 5 tokens, Refill: 2 tokens/sec

t=0s    🪣 [🟢🟢🟢🟢🟢]  bucket starts full
  req → consume 1 → 4 left  ✅
  req → consume 1 → 3 left  ✅
  req → consume 1 → 2 left  ✅
  req → consume 1 → 1 left  ✅
  req → consume 1 → 0 left  ✅
  req → 0 tokens   → ❌ BLOCKED (retry in 500ms)

t=3s    refill: min(5, 0 + floor(3s × 2)) = 5 tokens
  req → consume 1 → 4 left  ✅
```

**Key insight:** Tokens are calculated on-demand using elapsed time — no background timer.

```typescript
import { TokenBucket, TokenBucketMemoryStore } from "rate-shield";

const store = new TokenBucketMemoryStore();
const limiter = new TokenBucket(5, 2, 5, store);
// capacity=5, refillRate=2 tokens/sec, maxCapacity=5

const result = limiter.consume("user-123");
```

#### Sliding Window vs Token Bucket

| | Sliding Window | Token Bucket |
|---|---|---|
| **Stores** | `[ ...timestamps ]` | `{ tokens, lastRefillTime }` |
| **Memory** | Higher (1 entry/request) | Very low (2 numbers/key) |
| **Bursts** | Strictly blocked | Allows controlled bursts |
| **Flexible cost** | ❌ 1 req = 1 count | ✅ Can consume N tokens |
| **Use when** | Strict accuracy | APIs with varying request costs |

---

### 4. Leaky Bucket ✅

Requests fill a bucket that **leaks at a constant rate**. If the bucket overflows, new requests are rejected. This enforces a **perfectly smooth** output rate.

```
Capacity: 5, Leak Rate: 2 req/sec

t=0s    🪣 water=0 (empty)
  req → 0+1=1 ≤ 5?  ✅  water=1
  req → 1+1=2 ≤ 5?  ✅  water=2
  req → 2+1=3 ≤ 5?  ✅  water=3
  req → 3+1=4 ≤ 5?  ✅  water=4
  req → 4+1=5 ≤ 5?  ✅  water=5
  req → 5+1=6 > 5?  ❌  BLOCKED

t=3s    leaked = 3s × 2 = 6, water = max(0, 5-6) = 0
  req → 0+1=1 ≤ 5?  ✅  water=1
```

```typescript
import { LeakyBucket, LeakyBucketMemoryStore } from "rate-shield";

const store = new LeakyBucketMemoryStore();
const limiter = new LeakyBucket(5, 2, store);
// capacity=5, leakRate=2 req/sec

const result = limiter.consume("user-123");
```

#### Token Bucket vs Leaky Bucket

| | Token Bucket | Leaky Bucket |
|---|---|---|
| **Bucket starts** | Full (tokens) | Empty (no water) |
| **Request** | Removes a token | Adds water |
| **Over time** | Tokens refill | Water leaks out |
| **Denied when** | Bucket empty | Bucket full |
| **Bursts** | ✅ Allows controlled bursts | ❌ Strictly smooth output |
| **Use when** | Flexible APIs | Need constant throughput |



## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## 📄 License

MIT © [Kru5hna](https://github.com/Kru5hna)

---

<p align="center">
  <sub>Built with 💜 as a learning project — understanding rate limiting from the ground up.</sub>
</p>
