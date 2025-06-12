import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingOptions {
  debounceMs?: number;
  cache?: boolean;
  cacheTimeMs?: number;
}

export const useOptimizedLoading = (defaultOptions: LoadingOptions = {}) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map());
  
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { debounceMs = 300, cache: enableCache = true, cacheTimeMs = 60000 } = defaultOptions;

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    const existingTimeout = timeoutRefs.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (isLoading) {
      // Start loading immediately
      setLoadingStates(prev => ({ ...prev, [key]: true }));
    } else {
      // Debounce stop loading to prevent flashing
      const timeout = setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [key]: false }));
        timeoutRefs.current.delete(key);
      }, debounceMs);
      
      timeoutRefs.current.set(key, timeout);
    }
  }, [debounceMs]);

  const getCachedData = useCallback((key: string) => {
    if (!enableCache) return null;
    
    const cachedItem = cache.get(key);
    if (!cachedItem) return null;
    
    const isExpired = Date.now() - cachedItem.timestamp > cacheTimeMs;
    if (isExpired) {
      cache.delete(key);
      return null;
    }
    
    return cachedItem.data;
  }, [cache, enableCache, cacheTimeMs]);

  const setCachedData = useCallback((key: string, data: any) => {
    if (!enableCache) return;
    
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, { data, timestamp: Date.now() });
      return newCache;
    });
  }, [enableCache]);

  const withLoading = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>,
    options: { skipCache?: boolean } = {}
  ): Promise<T> => {
    // Check cache first
    if (!options.skipCache) {
      const cachedData = getCachedData(key);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    setLoading(key, true);
    
    try {
      const result = await asyncFn();
      setCachedData(key, result);
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading, getCachedData, setCachedData]);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
    } else {
      setCache(new Map());
    }
  }, []);

  return {
    isLoading,
    setLoading,
    withLoading,
    clearCache,
    loadingStates
  };
}; 