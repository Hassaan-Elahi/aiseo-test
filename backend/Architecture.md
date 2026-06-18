# Architecture

## Why NestJS Instead of Plain Express

This implementation intentionally uses NestJS for the same HTTP contract because it provides a structured, scalable architecture with clear module boundaries, dependency injection, and composable guards/interceptors. Compared to a single-file Express approach, NestJS makes the advanced requirements in this assessment easier to reason about and safer to evolve.

Key reasons:
- Modular boundaries: users, cache, queue, metrics, and rate limiting are isolated.
- Testability: providers are class-based and injectable, making unit/e2e tests straightforward.
- Cross-cutting concerns: global guard/interceptor cleanly handle rate limits and response-time metrics.
- Maintainability: TypeScript-first patterns and decorators reduce accidental coupling.
- Scalability path: components can later move to Redis/Bull/Prometheus with minimal API changes.

## High-Level Components

- Users module
- Implements GET /users/:id and POST /users.
- Handles in-flight request coalescing so concurrent misses for the same user share one fetch.

- Cache module
- In-memory LRU cache with TTL 60s.
- Tracks hits, misses, and size.
- Periodic stale-entry cleanup task.
- Exposes DELETE /cache and GET /cache-status.

- Queue module
- In-memory async queue worker with bounded concurrency.
- Executes simulated DB fetch jobs without blocking incoming request handling.

- Rate limit guard
- Enforces both limits per client key:
  - 5 requests per 10 seconds (burst)
  - 10 requests per 60 seconds (sustained)
- Returns structured 429 payloads with retry guidance.

- Metrics module
- Global response-time accounting via interceptor.
- Tracks total requests, total errors, error rate, average response time, and p95 response time.
- Captures rolling 10-second snapshots for trend analysis over time.
- Exposes GET /metrics-status for monitoring visibility.

## Request Flow (GET /users/:id)

1. RateLimitGuard validates burst and minute windows.
2. UsersService checks LRU cache.
3. On miss, UsersService checks in-flight map for same user id.
4. If in-flight exists, request awaits existing promise.
5. Otherwise, a fetch job is enqueued.
6. Queue worker simulates 200ms DB latency and reads mock user store.
7. Result is cached with 60s TTL and returned.
8. MetricsInterceptor records response time for status reporting.

## Performance Notes

- Cache hit path avoids async queue and simulated DB delay.
- Request coalescing prevents thundering-herd behavior for identical cache misses.
- Cleanup routines in both cache and limiter prevent unbounded in-memory state growth.

## Monitoring and Observability

- Simple logging mechanism (no external dependency) logs API/cache performance snapshots every 30 seconds.
- 429 responses include Retry-After header and structured payload details.
- Monitoring endpoint provides current summary plus recent time windows for response times and error rates.

## Future Extension

Monitoring can be extended with Prometheus by exporting cache metrics, limiter rejections, queue depth, and latency histograms to a /metrics endpoint.
