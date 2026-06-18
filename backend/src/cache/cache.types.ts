export interface CacheStatus {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
