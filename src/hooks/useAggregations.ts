import { useState, useEffect, useMemo } from 'react';
import type { 
  Aggregations, 
  StateRanking, 
  AirlineRanking, 
  RouteRanking,
} from '../types';
import { getAggregations, getStateRankings, getAirlineRankings, getRouteRankings } from '../utils/api';

interface UseAggregationsProps {
  month: string | null;
  airline: string | null;
  state: string | null;
}

export function useAggregations({ 
  month,
  airline,
  state
}: UseAggregationsProps): Aggregations {
  
  const [aggregationsData, setAggregationsData] = useState<any>(null);
  const [stateRankingsData, setStateRankingsData] = useState<StateRanking[]>([]);
  const [airlineRankingsData, setAirlineRankingsData] = useState<AirlineRanking[]>([]);
  const [routeRankingsData, setRouteRankingsData] = useState<RouteRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load all aggregation data
  useEffect(() => {
    if (!month) return; // Wait for month to be set
    
    async function loadAggregations() {
      setIsLoading(true);
      try {
        // Load all data in parallel
        const [aggData, stateData, airlineData, routeData] = await Promise.all([
          getAggregations({ month, airline, state }),
          getStateRankings({ month, airline, limit: 10 }),
          getAirlineRankings({ month, limit: 10 }),
          getRouteRankings({ month, airline, state }),
        ]);
        
        setAggregationsData(aggData);
        setStateRankingsData(stateData.rankings || []);
        setAirlineRankingsData(airlineData.rankings || []);
        setRouteRankingsData(routeData.routes || []);
      } catch (error) {
        console.error('Failed to load aggregations:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadAggregations();
  }, [month, airline, state]);
  
  return useMemo(() => {
    if (!aggregationsData) {
      // Return empty/default aggregations while loading
      return {
        totalPassengers: 0,
        totalFlights: 0,
        avgPassengersPerFlight: 0,
        uniqueStates: 0,
        uniqueAirports: 0,
        totalMilesTraveled: 0,
        topState: null,
        topAirline: null,
        stateRankings: [],
        airlineRankings: [],
        routeRankings: [],
        comparison: {
          previousMonth: null,
          passengerChange: null,
          flightChange: null,
          previousPassengers: null,
          previousFlights: null,
        },
      };
    }
    
    // Transform API response to match Aggregations interface
    return {
      totalPassengers: aggregationsData.totalPassengers || 0,
      totalFlights: aggregationsData.totalFlights || 0,
      avgPassengersPerFlight: aggregationsData.avgPassengersPerFlight || 0,
      uniqueStates: aggregationsData.uniqueStates || 0,
      uniqueAirports: aggregationsData.uniqueAirports || 0,
      totalMilesTraveled: 0, // Not provided by API, would need to calculate from routes
      topState: aggregationsData.topState || null,
      topAirline: aggregationsData.topAirline || null,
      stateRankings: stateRankingsData,
      airlineRankings: airlineRankingsData,
      routeRankings: routeRankingsData.map((r: any) => ({
        id: r.destinationCode,
        destinationCode: r.destinationCode,
        destinationName: r.destinationName,
        destinationCity: r.destinationCity,
        destinationState: r.destinationState,
        destinationStateCode: r.destinationStateCode,
        destinationLat: r.destinationLat,
        destinationLon: r.destinationLon,
        distanceMiles: r.distanceMiles,
        passengers: r.passengers,
        flights: r.flights,
        avgPassengersPerFlight: r.avgPassengersPerFlight,
        primaryCarrier: r.primaryCarrier,
        primaryCarrierShare: r.primaryCarrierShare,
      })),
      comparison: aggregationsData.comparison || {
        previousMonth: null,
        passengerChange: null,
        flightChange: null,
        previousPassengers: null,
        previousFlights: null,
      },
    };
  }, [aggregationsData, stateRankingsData, airlineRankingsData, routeRankingsData]);
}
