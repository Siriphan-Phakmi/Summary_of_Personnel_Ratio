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

// Cache management
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedData = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

export const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
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

  // Monitor memory usage
  monitorMemoryUsage() {
    if (performance.memory) {
      setInterval(() => {
        this.reportMetric({
          name: 'memory_usage',
          value: performance.memory.usedJSHeapSize / (1024 * 1024),
          category: 'Memory'
        });
      }, 60000); // Check every minute
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
