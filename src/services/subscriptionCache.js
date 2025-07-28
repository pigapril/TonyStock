/**
 * Subscription data caching service
 * Implements intelligent caching for subscription-related data
 */

class SubscriptionCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheConfig = {
      // Cache durations in milliseconds
      userPlan: 5 * 60 * 1000,        // 5 minutes
      usageStats: 1 * 60 * 1000,      // 1 minute
      subscriptionHistory: 10 * 60 * 1000, // 10 minutes
      planComparison: 30 * 60 * 1000,  // 30 minutes
      quotaInfo: 30 * 1000,           // 30 seconds
    };
    
    // Cleanup expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cached data if valid, otherwise return null
   */
  get(key, type = 'default') {
    const cacheKey = `${type}:${key}`;
    const data = this.cache.get(cacheKey);
    const timestamp = this.cacheTimestamps.get(cacheKey);
    
    if (!data || !timestamp) {
      return null;
    }
    
    const maxAge = this.cacheConfig[type] || 5 * 60 * 1000; // Default 5 minutes
    const isExpired = Date.now() - timestamp > maxAge;
    
    if (isExpired) {
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      return null;
    }
    
    return data;
  }

  /**
   * Set data in cache with timestamp
   */
  set(key, data, type = 'default') {
    const cacheKey = `${type}:${key}`;
    this.cache.set(cacheKey, data);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key, type = 'default') {
    const cacheKey = `${type}:${key}`;
    this.cache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries of a specific type
   */
  invalidateType(type) {
    const keysToDelete = [];
    
    for (const [key] of this.cache) {
      if (key.startsWith(`${type}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, timestamp] of this.cacheTimestamps) {
      const type = key.split(':')[0];
      const maxAge = this.cacheConfig[type] || 5 * 60 * 1000;
      
      if (now - timestamp > maxAge) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      cacheTypes: this.getCacheTypeStats(),
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get cache statistics by type
   */
  getCacheTypeStats() {
    const stats = {};
    
    for (const [key] of this.cache) {
      const type = key.split(':')[0];
      stats[type] = (stats[type] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, value] of this.cache) {
      totalSize += key.length * 2; // Rough estimate for string size
      totalSize += JSON.stringify(value).length * 2; // Rough estimate for object size
    }
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024),
      mb: Math.round(totalSize / (1024 * 1024))
    };
  }

  /**
   * Preload data for better UX
   */
  async preloadUserData(userId, apiService) {
    try {
      // Preload user plan info
      if (!this.get(userId, 'userPlan')) {
        const planInfo = await apiService.getUserPlan(userId);
        this.set(userId, planInfo, 'userPlan');
      }

      // Preload usage stats
      if (!this.get(userId, 'usageStats')) {
        const usageStats = await apiService.getUsageStats(userId);
        this.set(userId, usageStats, 'usageStats');
      }
    } catch (error) {
      console.warn('Failed to preload user data:', error);
    }
  }

  /**
   * Destroy cache and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Create singleton instance
const subscriptionCache = new SubscriptionCache();

// Cache-aware API wrapper
export const withCache = (apiFunction, cacheKey, cacheType = 'default') => {
  return async (...args) => {
    // Try to get from cache first
    const cachedData = subscriptionCache.get(cacheKey, cacheType);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, call API and cache result
    try {
      const data = await apiFunction(...args);
      subscriptionCache.set(cacheKey, data, cacheType);
      return data;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
};

// Optimistic update helper
export const optimisticUpdate = (cacheKey, cacheType, updateFn, rollbackData) => {
  const currentData = subscriptionCache.get(cacheKey, cacheType);
  const optimisticData = updateFn(currentData);
  
  // Set optimistic data immediately
  subscriptionCache.set(cacheKey, optimisticData, cacheType);
  
  // Return rollback function
  return () => {
    if (rollbackData) {
      subscriptionCache.set(cacheKey, rollbackData, cacheType);
    } else {
      subscriptionCache.invalidate(cacheKey, cacheType);
    }
  };
};

export default subscriptionCache;