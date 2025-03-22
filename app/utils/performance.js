// Performance optimization utilities
import { useCallback, useMemo } from 'react';

// Memoized calculation functions
export const useMemoizedCalculations = (data, dependencies = []) => {
  return useMemo(() => {
    if (!data) return null;
    
    const calculateTotals = () => {
      const totals = {
        patients: 0,
        staff: 0,
        admissions: 0,
        discharges: 0
      };

      Object.values(data).forEach(ward => {
        totals.patients += Number(ward.numberOfPatients || 0);
        totals.staff += Number(ward.RN || 0) + Number(ward.PN || 0);
        totals.admissions += Number(ward.newAdmissions || 0);
        totals.discharges += Number(ward.discharge || 0);
      });

      return totals;
    };

    return {
      totals: calculateTotals(),
      wardCount: Object.keys(data).length,
    };
  }, dependencies);
};

// Optimized data filtering
export const useOptimizedFilter = () => {
  return useCallback((data, filters) => {
    if (!data || !Array.isArray(data)) return [];

    return data.filter(item => {
      // Date filter
      if (filters.date && item.date !== filters.date) return false;

      // Shift filter
      if (filters.shift && item.shift !== filters.shift) return false;

      // Ward filter
      if (filters.ward && (!item.wards || !item.wards[filters.ward])) return false;

      // Recorder filter
      if (filters.recorder && item.recorder !== filters.recorder) return false;

      return true;
    });
  }, []);
};

// Debounce function for search/filter operations
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Chunk large data processing
export const processInChunks = async (items, processItem, chunkSize = 100) => {
  const results = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const processedChunk = await Promise.all(chunk.map(processItem));
    results.push(...processedChunk);
    
    // Allow browser to handle other tasks
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
};

// Cache management with improved recovery
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BACKUP_CACHE = new Map(); // Secondary cache for recovery

export const getCachedData = (key) => {
  const cached = cache.get(key);
  if (!cached) {
    // Attempt to recover from backup cache
    const backupCached = BACKUP_CACHE.get(key);
    if (backupCached) {
      console.log('Recovered data from backup cache for key:', key);
      cache.set(key, backupCached);
      return backupCached.data;
    }
    return null;
  }
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    // Store in backup before deleting from main cache
    BACKUP_CACHE.set(key, {...cached, isExpired: true});
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

export const setCachedData = (key, data) => {
  const cacheEntry = {
    data,
    timestamp: Date.now()
  };
  cache.set(key, cacheEntry);
  
  // Also update backup cache
  BACKUP_CACHE.set(key, {...cacheEntry});
  
  // Schedule auto cleanup
  setTimeout(() => {
    if (cache.has(key) && (Date.now() - cache.get(key).timestamp > CACHE_DURATION)) {
      cache.delete(key);
    }
  }, CACHE_DURATION + 1000);
};

// Web Vitals
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.initWebVitals();
  }

  initWebVitals() {
    getCLS(this.handleMetric);
    getFID(this.handleMetric);
    getLCP(this.handleMetric);
    getFCP(this.handleMetric);
    getTTFB(this.handleMetric);
  }

  handleMetric = (metric) => {
    this.metrics[metric.name] = metric.value;
    this.reportMetric(metric);
  };

  reportMetric(metric) {
    // ส่งข้อมูลไปยัง analytics หรือ monitoring service
    if (process.env.NODE_ENV === 'production') {
      // ตัวอย่างการส่งไปยัง Google Analytics
      window.gtag?.('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(metric.value),
        non_interaction: true,
      });
    }
    console.log('[Performance]', metric.name, metric.value);
  }

  // Monitor component render time
  measureComponentRender(componentName, startTime) {
    const duration = performance.now() - startTime;
    this.reportMetric({
      name: `${componentName}_render`,
      value: duration,
      category: 'Component Performance'
    });
  }

  // Monitor API calls
  measureApiCall(endpoint, startTime) {
    const duration = performance.now() - startTime;
    this.reportMetric({
      name: `api_${endpoint}`,
      value: duration,
      category: 'API Performance'
    });
  }

  // Monitor resource loading
  monitorResourceLoading() {
    if (typeof window !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
            this.reportMetric({
              name: `resource_${entry.name}`,
              value: entry.duration,
              category: 'Resource Loading'
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // Monitor memory usage - fixed implementation
  monitorMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      setInterval(() => {
        this.reportMetric({
          name: 'memory_usage',
          value: performance.memory.usedJSHeapSize / (1024 * 1024),
          category: 'Memory'
        });
      }, 60000);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-recovery system
export class DataRecoverySystem {
  constructor(storageKey = 'form_data_recovery') {
    this.storageKey = storageKey;
    this.autoSaveInterval = null;
  }
  
  startAutoSave(getData, interval = 30000) {
    // Clear any existing interval
    this.stopAutoSave();
    
    // Set up new interval
    this.autoSaveInterval = setInterval(() => {
      try {
        const data = getData();
        if (data) {
          localStorage.setItem(this.storageKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        }
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    }, interval);
    
    return this;
  }
  
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    return this;
  }
  
  getRecoveryData() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Recovery data retrieval failed:', e);
    }
    return null;
  }
  
  clearRecoveryData() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('Failed to clear recovery data:', e);
    }
  }
}
