<p align="center">
  <img src="https://img.shields.io/badge/⚡-Rate_Shield-blueviolet?style=for-the-badge&logoColor=white" alt="Rate Shield" />
</p>

<h1 align="center">Rate-Shield</h1>

<p align="center">
  <strong>A lightweight, pluggable rate limiting library for Node.js — built from scratch.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/rate-shield"><img src="https://img.shields.io/npm/v/rate-shield?style=flat-square&color=blueviolet" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/rate-shield"><img src="https://img.shields.io/npm/dm/rate-shield?style=flat-square&color=blue" alt="NPM Downloads" /></a>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

<p align="center">
  <code>npm install rate-shield</code>
</p>

---

## Overview

Rate Shield answers one question: **"Should I allow or block this request?"**

It provides four battle-tested rate limiting algorithms — Fixed Window, Sliding Window, Token Bucket, and Leaky Bucket — each solving the flaws of the last. Start simple with in-memory storage, then scale to Redis with a one-line swap.

**Why rate-shield?**

- 🧩 **Pluggable** — swap storage backends without changing algorithm code
- 🔒 **Atomic Redis support** — Lua-scripted operations, zero race conditions
- 🪶 **Zero dependencies** (in-memory mode) — drop in anywhere
- 🏗️ **Fully typed** — written in TypeScript, ships with declarations
- ⚡ **Express-ready** — drop-in middleware included

---

## Installation

```bash
npm install rate-shield
```

```bash
# For Redis support
npm install rate-shield ioredis
```

---

## Quick Start

```typescript
import { FixedWindow, MemoryStore } from "rate-shield";

const store = new MemoryStore();
const limiter = new FixedWindow(5, 10_000, store); // 5 requests per 10 seconds

const result = limiter.consume("192.168.1.1");

if (result.allowed) {
  console.log(`✅ Allowed — ${result.remaining} requests remaining`);
} else {
  console.log(`❌ Blocked — retry after ${result.retryAfterMs}ms`);
}
```

---

## Express Middleware

```typescript
import express from "express";
import { rateLimit, FixedWindow, MemoryStore } from "rate-shield";

const app = express();

const limiter = new FixedWindow(100, 60_000, new MemoryStore()); // 100 req/min

app.use("/api", rateLimit({
  limiter,
  keyGenerator: (req) => req.ip,  // rate limit by IP
  statusCode: 429,
  errorMessage: "Too many requests. Please slow down.",
}));

app.get("/api/data", (req, res) => res.send("Hello!"));
```

---

## Redis (Production / Multi-Server)

In-memory stores work for a single process. For distributed setups (multiple servers, serverless), use the atomic Redis limiters powered by Lua scripts — no race conditions, no double-counting.

```typescript
import { Redis } from "ioredis";
import { FixedWindowRedis, rateLimit } from "rate-shield";

const redis = new Redis("redis://localhost:6379");
const limiter = new FixedWindowRedis(redis, 100, 60_000); // 100 req/min

app.use("/api", rateLimit({ limiter }));
```

Available Redis limiters: `FixedWindowRedis`, `SlidingWindowRedis`, `TokenBucketRedis`, `LeakyBucketRedis`

---

## High Availability (Circuit Breaker)

Network partitions happen. If your Redis server goes down, `rate-shield` won't crash your API. Wrap your Redis limiter in a `FallbackLimiter` to automatically route traffic to local memory until Redis recovers. 

It features **fail-open defaults**, **timeout controls**, and a **state-machine Circuit Breaker** to prevent retry-storms.

```typescript
import { FallbackLimiter, FixedWindow, MemoryStore } from "rate-shield";
import { FixedWindowRedis } from "rate-shield/redis";

const redisLimiter = new FixedWindowRedis(redis, 100, 60_000);
const memoryLimiter = new FixedWindow(100, 60_000, new MemoryStore());

const haLimiter = new FallbackLimiter(redisLimiter, memoryLimiter, {
  timeoutMs: 50,                // Fallback if Redis takes >50ms
  circuitBreakerErrors: 3,      // Trip circuit after 3 fails
  circuitBreakerCooldownMs: 10_000, // Wait 10s before retrying Redis
  onError: (err, isTripped) => console.error(`Redis failed. Tripped: ${isTripped}`)
});

app.use("/api", rateLimit({ limiter: haLimiter }));
```

---

## Algorithms

Each algorithm solves a flaw in the previous one. Pick based on your use case.

| Algorithm | Memory | Bursts | Best for |
|---|---|---|---|
| **Fixed Window** | Very low | ⚠️ Boundary burst possible | Simple APIs, low-traffic routes |
| **Sliding Window** | Medium (1 entry/req) | ✅ No burst | Accuracy-critical endpoints |
| **Token Bucket** | Very low | ✅ Controlled burst | APIs with variable request costs |
| **Leaky Bucket** | Very low | ❌ Strictly smooth | Constant throughput (queues, streams) |

### Fixed Window

Divides time into fixed windows. Counter resets at the boundary.

```typescript
import { FixedWindow, MemoryStore } from "rate-shield";

const limiter = new FixedWindow(
  5,             // limit: max requests per window
  10_000,        // windowMs: window size in milliseconds
  new MemoryStore()
);

const result = limiter.consume("user-123");
```

> ⚠️ **Note:** Clients can make 2× the allowed requests by hitting the boundary of two consecutive windows. Use Sliding Window if this matters.

### Sliding Window

Stores individual request timestamps. The window moves with time — no boundary burst.

```typescript
import { SlidingWindow, SlidingWindowMemoryStore } from "rate-shield";

const limiter = new SlidingWindow(
  5,             // limit
  10_000,        // windowMs
  new SlidingWindowMemoryStore()
);

const result = limiter.consume("user-123");
```

### Token Bucket

A bucket fills with tokens at a constant rate. Each request consumes one. Allows controlled bursts up to the bucket capacity. Tokens are refilled **lazily** — no background timers.

```typescript
import { TokenBucket, TokenBucketMemoryStore } from "rate-shield";

const limiter = new TokenBucket(
  5,             // capacity: max tokens (burst size)
  2,             // refillRate: tokens added per second
  5,             // maxCapacity
  new TokenBucketMemoryStore()
);

const result = limiter.consume("user-123");
```

### Leaky Bucket

Requests fill a bucket that leaks at a constant rate. Enforces perfectly smooth output — no bursts allowed.

```typescript
import { LeakyBucket, LeakyBucketMemoryStore } from "rate-shield";

const limiter = new LeakyBucket(
  5,             // capacity: max queue depth
  2,             // leakRate: requests drained per second
  new LeakyBucketMemoryStore()
);

const result = limiter.consume("user-123");
```

---

## API Reference

### `RateLimitResult`

All `.consume()` calls return:

```typescript
interface RateLimitResult {
  allowed: boolean;       // true = allow, false = block
  remaining: number;      // requests remaining in this window
  retryAfterMs: number;   // milliseconds to wait before retrying (0 if allowed)
  limit: number;          // the configured max
}
```

### `rateLimit(options)` — Express Middleware

| Option | Type | Default | Description |
|---|---|---|---|
| `limiter` | `Limiter` | **required** | Any rate limiter instance |
| `keyGenerator` | `(req) => string` | `req.ip` | Identifies the client |
| `statusCode` | `number` | `429` | HTTP status when blocked |
| `errorMessage` | `string` | `"Too Many Requests"` | Response body when blocked |

### Custom Storage

Implement the `Storage` interface to plug in any backend (Redis, Postgres, etc.):

```typescript
interface Storage {
  get(key: string): FixedWindowState | null;
  set(key: string, value: FixedWindowState): void;
  delete(key: string): void;
}
```

---

## Architecture

```
src/
├── types.ts              ← Interfaces & shared contracts
├── storage/
│   └── memoryStore.ts    ← In-memory Map-based stores
├── core/
│   ├── fixedWindow.ts    ← Fixed Window algorithm
│   ├── slidingWindow.ts  ← Sliding Window algorithm
│   ├── tokenBucket.ts    ← Token Bucket algorithm
│   ├── leakyBucket.ts    ← Leaky Bucket algorithm
│   └── fallbackLimiter.ts← Circuit breaker / Failover wrapper
├── redis/
│   ├── index.ts          ← Subpath exporter ('rate-shield/redis')
│   └── atomicLimiter.ts  ← Lua scripts for Redis atomic ops
└── index.ts              ← Barrel exports
```

| Layer | Responsibility |
|---|---|
| **Types** | Contracts — what data looks like |
| **Storage** | Persistence — where state lives (`Map` or Redis) |
| **Algorithm** | Logic — the allow/block decision |
| **Resilience**| `FallbackLimiter` keeps APIs online during network crashes |

Algorithms are fully decoupled from storage. Swap `MemoryStore` for an atomic Redis store without touching core algorithm code.

---

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

---



## License

MIT © [Kru5hna](https://github.com/Kru5hna)

---

<p align="center">
  <sub>Built with 💜 - understanding rate limiting from the ground up.</sub>
</p>