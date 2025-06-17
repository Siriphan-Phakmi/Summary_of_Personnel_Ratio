import { Logger } from '@/app/lib/utils/logger';

// A generic in-memory cache for frequently queried data to enhance performance.
const queryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export const getCachedQuery = <T>(key: string): T | null => {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
};

export const setCachedQuery = <T>(key: string, data: T): void => {
  queryCache.set(key, { data, timestamp: Date.now() });
};

export const clearCache = (key: string): void => {
  queryCache.delete(key);
};

export const clearAllCache = (): void => {
  queryCache.clear();
};

// Clean up cache periodically
export const setupCacheCleanup = () => {
  setInterval(() => {
    const now = Date.now();
    Array.from(queryCache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_DURATION) {
        queryCache.delete(key);
      }
    });
  }, 60000); // Clean every minute
};

// Initialize cache cleanup
setupCacheCleanup(); 