// ============================================================
// JFK Domestic Air Traffic Explorer - Type Definitions
// ============================================================

/**
 * A single flight route record representing monthly aggregated data
 * for a specific origin-destination-carrier combination
 */
export interface FlightRoute {
  id: string;
  month: string;                    // Format: "YYYY-MM" (e.g., "2025-10")
  origin: 'JFK';                    // Always JFK for this app
  destinationCode: string;          // IATA code (e.g., "LAX")
  destinationName: string;          // Full airport name
  destinationCity: string;          // City name
  destinationState: string;         // Full state name
  destinationStateCode: string;     // 2-letter state code
  destinationLat: number;           // Latitude
  destinationLon: number;           // Longitude
  distanceMiles: number;            // Distance from JFK in miles
  carrier: string;                  // Airline name (e.g., "JetBlue")
  carrierCode: string;              // IATA carrier code (e.g., "B6")
  passengers: number;               // Total passengers for the month
  flights: number;                  // Total flights for the month
}

/**
 * Airport reference data
 */
export interface Airport {
  code: string;                     // IATA code
  name: string;                     // Full airport name
  city: string;                     // City name
  state: string;                    // Full state name
  stateCode: string;                // 2-letter state code
  lat: number;                      // Latitude
  lon: number;                      // Longitude
  distanceFromJFK: number;          // Distance from JFK in miles
}

/**
 * State ranking entry for the top destinations list
 */
export interface StateRanking {
  state: string;                    // Full state name
  stateCode: string;                // 2-letter state code
  passengers: number;               // Total passengers to this state
  flights: number;                  // Total flights to this state
  share: number;                    // Percentage of total traffic (0-100)
  airportCount: number;             // Number of airports served in this state
}

/**
 * Airline ranking entry for the top carriers list
 */
export interface AirlineRanking {
  carrier: string;                  // Airline name
  carrierCode: string;              // IATA carrier code
  passengers: number;               // Total passengers carried
  flights: number;                  // Total flights operated
  share: number;                    // Percentage of total traffic (0-100)
  destinationCount: number;         // Number of destinations served
}

/**
 * Route ranking entry for map visualization
 */
export interface RouteRanking {
  id: string;
  destinationCode: string;
  destinationName: string;
  destinationCity: string;
  destinationState: string;
  destinationStateCode: string;
  destinationLat: number;
  destinationLon: number;
  distanceMiles: number;
  passengers: number;
  flights: number;
  avgPassengersPerFlight: number;
  primaryCarrier: string;           // Carrier with most passengers on this route
  primaryCarrierShare: number;      // Percentage by primary carrier
}

/**
 * Month-over-month comparison data
 */
export interface MonthComparison {
  previousMonth: string | null;     // Previous month string or null if unavailable
  passengerChange: number | null;   // Percentage change (-100 to +∞), null if unavailable
  flightChange: number | null;      // Percentage change, null if unavailable
  previousPassengers: number | null;
  previousFlights: number | null;
}

/**
 * Complete aggregations computed from filtered data
 */
export interface Aggregations {
  // Summary metrics
  totalPassengers: number;
  totalFlights: number;
  avgPassengersPerFlight: number;
  uniqueStates: number;
  uniqueAirports: number;
  totalMilesTraveled: number;       // passengers * distance summed
  
  // Top performers
  topState: {
    name: string;
    stateCode: string;
    passengers: number;
    share: number;
  } | null;
  
  topAirline: {
    name: string;
    carrierCode: string;
    passengers: number;
    share: number;
  } | null;
  
  // Rankings
  stateRankings: StateRanking[];
  airlineRankings: AirlineRanking[];
  routeRankings: RouteRanking[];
  
  // Month-over-month comparison
  comparison: MonthComparison;
}

/**
 * Fun fact for the dashboard
 */
export interface FunFact {
  id: string;
  icon: string;                     // Emoji or icon identifier
  text: string;                     // Description text
  value: string;                    // Formatted value/comparison
}

/**
 * Filter state for the application
 */
export interface FilterState {
  month: string;                    // Selected month (YYYY-MM)
  airline: string | null;           // Selected airline (null = all)
  state: string | null;             // Selected state (null = all)
}

/**
 * Route display mode for the map
 */
export type RouteMode = 'top' | 'all';

/**
 * Application state
 */
export interface AppState {
  filters: FilterState;
  routeMode: RouteMode;
  topNRoutes: number;               // Number of top routes to display (10-100)
  highlightedState: string | null;  // State currently highlighted on map
  highlightedAirline: string | null; // Airline currently highlighted
}

/**
 * GeoJSON Feature for state choropleth
 */
export interface StateFeature {
  type: 'Feature';
  properties: {
    name: string;
    stateCode: string;
    passengers?: number;
    flights?: number;
    share?: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

/**
 * GeoJSON FeatureCollection for states
 */
export interface StateFeatureCollection {
  type: 'FeatureCollection';
  features: StateFeature[];
}
