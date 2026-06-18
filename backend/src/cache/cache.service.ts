import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { LRUCache } from "lru-cache";
import { CACHE_CLEANUP_INTERVAL_MS, CACHE_TTL_MS } from "../constants";
import { CacheEntry, CacheStatus } from "./cache.types";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly cache = new LRUCache<string, CacheEntry<unknown>>({
    max: 1000,
  });

  private hits = 0;
  private misses = 0;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, CACHE_CLEANUP_INTERVAL_MS);
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      return;
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  upsert<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStatus(): CacheStatus {
    const totalLookups = this.hits + this.misses;
    const hitRate =
      totalLookups === 0 ? 0 : Number((this.hits / totalLookups).toFixed(4));

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
