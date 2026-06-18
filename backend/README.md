# NestJS User Data API

A TypeScript NestJS API implementing user retrieval with advanced in-memory caching, dual-window rate limiting, and asynchronous queue-based processing.

## Features

- NestJS server with validation and CORS
- In-memory LRU cache with 60-second TTL
- Cache stats: hits, misses, size
- Background stale cache cleanup task
- GET /users/:id with cache-first lookup and 200ms simulated DB delay on miss
- Concurrent request coalescing for same user ID
- Dual rate limiting per client:
  - 10 requests / 60 seconds
  - 5 requests / 10 seconds burst
- Async in-memory queue worker for non-blocking simulated DB tasks
- Bonus endpoints:
  - DELETE /cache
  - GET /cache-status
  - POST /users
- Response-time tracking (average response time returned by /cache-status)
- Monitoring over time via in-memory metrics windows and periodic performance logs

## Mock Seed Data

- 1: John Doe (john@example.com)
- 2: Jane Smith (jane@example.com)
- 3: Alice Johnson (alice@example.com)

## Run

1. Install dependencies

```bash
npm install
```

2. Start in dev mode

```bash
npm run start:dev
```

3. Build and run production

```bash
npm run build
npm run start
```

Default port: 3000 (override with PORT env var).

## API Endpoints

### GET /users/:id

- Returns user from cache when available.
- On cache miss, simulates DB call (200ms).
- Returns 404 if user does not exist.

Example:

```bash
curl http://localhost:3000/users/1
```

### POST /users

Creates a new user and warms cache.

Payload:

```json
{
  "name": "Bob Stone",
  "email": "bob@example.com"
}
```

Example:

```bash
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Bob Stone","email":"bob@example.com"}'
```

### DELETE /cache

Clears the entire cache.

```bash
curl -X DELETE http://localhost:3000/cache
```

### GET /cache-status

Returns:
- cache size
- cache hits
- cache misses
- cache hit rate
- average and p95 response time in ms
- total requests, total errors, and error rate

```bash
curl http://localhost:3000/cache-status
```

### GET /metrics-status

Returns API monitoring data:
- summary: total requests, total errors, error rate, average and p95 response time
- recentWindows: rolling per-10s snapshots for trend analysis over time

```bash
curl http://localhost:3000/metrics-status
```

## Rate Limiting

The API enforces both constraints per client IP (or x-forwarded-for):
- burst: max 5 requests in 10 seconds
- sustained: max 10 requests in 60 seconds

On violation, response is 429 with a meaningful message and retry hint.
Response includes a Retry-After header to improve client backoff behavior.

## Testing

Run unit tests:

```bash
npm test
```

Run e2e tests:

```bash
npm run test:e2e
```

Suggested manual checks (Postman/curl):
- First GET /users/1 should be slower than immediate second GET /users/1.
- Repeated rapid calls should trigger 429 burst limit.
- More than 10 requests within 60s should trigger minute limit.
- DELETE /cache should reset cache size to 0.

## Caching Strategy Summary

- LRU cache stores user objects keyed by user:id.
- Entries expire after 60 seconds.
- Cache hit/miss counters are tracked globally.
- A background cleanup interval proactively removes expired entries.
- Cache writes are skipped when a valid entry already exists; create operations intentionally upsert.

## Async Processing Summary

- Cache misses enqueue a DB-fetch job into an in-memory queue.
- Queue worker processes jobs asynchronously with bounded concurrency.
- Concurrent requests for the same uncached user share a single in-flight promise.

## Monitoring Summary

- A lightweight monitoring mechanism records latency and error outcomes for every request.
- Rolling 10-second snapshots are retained in memory to track trends over time.
- Cache and API performance snapshots are logged every 30 seconds (JSON log line) for operational visibility.

## Notes

This implementation intentionally uses NestJS over plain Express for stronger modular design, clean dependency boundaries, and easier long-term scaling.
