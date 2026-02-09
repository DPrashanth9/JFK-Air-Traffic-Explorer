/**
 * API Client
 * Handles all API calls to the Python backend
 * Includes caching and retry logic for better performance and reliability
 */

import { apiCache } from './cache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Generic API fetch function with caching and retry logic
 */
async function fetchApi<T>(
  endpoint: string,
  params?: Record<string, string | number | null | undefined>,
  options?: {
    useCache?: boolean;
    cacheTTL?: number;
    retry?: boolean;
  }
): Promise<T> {
  const { useCache = true, cacheTTL, retry = true } = options || {};
  
  // Generate cache key
  const cacheKey = apiCache.generateKey(endpoint, params);
  
  // Check cache first
  if (useCache) {
    const cached = apiCache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  // Add query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // Retry logic
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= (retry ? RETRY_CONFIG.maxRetries : 0); attempt++) {
    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      
      if (!response.ok) {
        // Check if status is retryable
        if (retry && RETRY_CONFIG.retryableStatuses.includes(response.status) && attempt < RETRY_CONFIG.maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the response
      if (useCache) {
        apiCache.set(cacheKey, data, cacheTTL);
      }
      
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on network errors if it's the last attempt
      if (attempt === RETRY_CONFIG.maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (retry && attempt < RETRY_CONFIG.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('API request failed');
}

/**
 * Get available filter options
 * Cached for 10 minutes since this changes infrequently
 */
export async function getFilters() {
  return fetchApi<{
    months: string[];
    airlines: string[];
    states: string[];
  }>('/api/filters', undefined, {
    useCache: true,
    cacheTTL: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get flight routes
 * Cached for 2 minutes since data can change
 */
export async function getRoutes(params?: {
  month?: string | null;
  airline?: string | null;
  state?: string | null;
}) {
  return fetchApi<{
    routes: any[];
    count: number;
  }>('/api/flights', params, {
    useCache: true,
    cacheTTL: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get aggregations
 * Disable cache when filters are active to ensure fresh data
 */
export async function getAggregations(params?: {
  month?: string | null;
  airline?: string | null;
  state?: string | null;
}) {
  const hasFilters = !!(params?.airline || params?.state);
  return fetchApi<any>('/api/aggregations', params, {
    useCache: !hasFilters, // Disable cache when filters are active
    cacheTTL: 2 * 60 * 1000, // 2 minutes if cached
  });
}

/**
 * Get state rankings
 */
export async function getStateRankings(params?: {
  month?: string | null;
  airline?: string | null;
  limit?: number;
}) {
  return fetchApi<{
    rankings: any[];
  }>('/api/states/rankings', params);
}

/**
 * Get airline rankings
 */
export async function getAirlineRankings(params?: {
  month?: string | null;
  limit?: number;
}) {
  return fetchApi<{
    rankings: any[];
  }>('/api/airlines/rankings', params);
}

/**
 * Get route rankings (for map)
 * Disable cache when filters are active to ensure fresh data
 */
export async function getRouteRankings(params?: {
  month?: string | null;
  airline?: string | null;
  state?: string | null;
  limit?: number;
}) {
  const hasFilters = !!(params?.airline || params?.state);
  return fetchApi<{
    routes: any[];
    count: number;
  }>('/api/routes/rankings', params, {
    useCache: !hasFilters, // Disable cache when filters are active
    cacheTTL: 2 * 60 * 1000, // 2 minutes if cached
  });
}
