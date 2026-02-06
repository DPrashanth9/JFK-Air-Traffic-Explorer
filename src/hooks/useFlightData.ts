import { useState, useMemo, useCallback, useEffect } from 'react';
import type { FlightRoute, FilterState } from '../types';
import { getFilters, getRoutes } from '../utils/api';

interface UseFlightDataReturn {
  // Raw and filtered data
  allRoutes: FlightRoute[];
  filteredRoutes: FlightRoute[];
  
  // Filter state
  filters: FilterState;
  setMonth: (month: string) => void;
  setAirline: (airline: string | null) => void;
  setState: (state: string | null) => void;
  resetFilters: () => void;
  
  // Filter options (derived from data)
  availableMonths: string[];
  availableAirlines: string[];
  availableStates: string[];
  
  // Loading state
  isLoading: boolean;
  error: string | null;
}

export function useFlightData(): UseFlightDataReturn {
  // State for data from API
  const [allRoutes, setAllRoutes] = useState<FlightRoute[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableAirlines, setAvailableAirlines] = useState<string[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize filters (will be updated when months load)
  const [filters, setFilters] = useState<FilterState>({
    month: '2025-10',
    airline: null,
    state: null,
  });
  
  // Load filter options on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        setError(null);
        const filterData = await getFilters();
        setAvailableMonths(filterData.months);
        setAvailableAirlines(filterData.airlines);
        setAvailableStates(filterData.states);
        
        // Set default month to most recent
        if (filterData.months.length > 0) {
          setFilters(prev => ({
            ...prev,
            month: filterData.months[0]
          }));
        }
      } catch (error) {
        console.error('Failed to load filters:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      }
    }
    
    loadFilters();
  }, []);
  
  // Load routes when filters change
  useEffect(() => {
    async function loadRoutes() {
      if (!filters.month) return; // Wait for month to be set
      
      setIsLoading(true);
      setError(null);
      try {
        const response = await getRoutes({
          month: filters.month,
          airline: filters.airline || undefined,
          state: filters.state || undefined,
        });
        
        // Transform API response to FlightRoute format
        const routes: FlightRoute[] = response.routes.map((r: any) => ({
          id: `${r.month}-JFK-${r.destinationCode}-${r.carrierCode}`,
          month: r.month,
          origin: 'JFK' as const,
          destinationCode: r.destinationCode,
          destinationName: r.destinationName,
          destinationCity: r.destinationCity,
          destinationState: r.destinationState,
          destinationStateCode: r.destinationStateCode,
          destinationLat: r.destinationLat,
          destinationLon: r.destinationLon,
          distanceMiles: r.distanceMiles,
          carrier: r.carrier,
          carrierCode: r.carrierCode,
          passengers: r.passengers,
          flights: r.flights,
        }));
        
        setAllRoutes(routes);
      } catch (error) {
        console.error('Failed to load routes:', error);
        setError(error instanceof Error ? error.message : 'Failed to load routes');
        setAllRoutes([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadRoutes();
  }, [filters.month, filters.airline, filters.state]);
  
  // Filter setters
  const setMonth = useCallback((month: string) => {
    setFilters(prev => ({ ...prev, month }));
  }, []);
  
  const setAirline = useCallback((airline: string | null) => {
    setFilters(prev => ({ ...prev, airline }));
  }, []);
  
  const setState = useCallback((state: string | null) => {
    setFilters(prev => ({ ...prev, state }));
  }, []);
  
  const resetFilters = useCallback(() => {
    setFilters({
      month: availableMonths[0] || '2025-10',
      airline: null,
      state: null,
    });
  }, [availableMonths]);
  
  // Filtered routes are the same as allRoutes (filtering is done server-side)
  const filteredRoutes = allRoutes;
  
  return {
    allRoutes,
    filteredRoutes,
    filters,
    setMonth,
    setAirline,
    setState,
    resetFilters,
    availableMonths,
    availableAirlines,
    availableStates,
    isLoading,
    error,
  };
}

/**
 * Format a month string (YYYY-MM) to a display format
 */
export function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
}

/**
 * Get the previous month string from a given month
 */
export function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 2); // -2 because months are 0-indexed and we want previous
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
