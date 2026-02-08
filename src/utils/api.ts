/**
 * API Client
 * Handles all API calls to the Python backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic API fetch function
 */
async function fetchApi<T>(
  endpoint: string,
  params?: Record<string, string | number | null | undefined>
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  // Add query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get available filter options
 */
export async function getFilters() {
  return fetchApi<{
    months: string[];
    airlines: string[];
    states: string[];
  }>('/api/filters');
}

/**
 * Get flight routes
 */
export async function getRoutes(params?: {
  month?: string | null;
  airline?: string | null;
  state?: string | null;
}) {
  return fetchApi<{
    routes: any[];
    count: number;
  }>('/api/flights', params);
}

/**
 * Get aggregations
 */
export async function getAggregations(params?: {
  month?: string | null;
  airline?: string | null;
  state?: string | null;
}) {
  return fetchApi<any>('/api/aggregations', params);
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
 */
export async function getRouteRankings(params?: {
  month?: string | null;
  airline?: string | null;
  state?: string | null;
  limit?: number;
}) {
  return fetchApi<{
    routes: any[];
    count: number;
  }>('/api/routes/rankings', params);
}
