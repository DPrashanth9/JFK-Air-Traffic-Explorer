import type { RouteRanking, FlightRoute } from '../types';
import { JFK_COORDINATES } from './constants';
import { AIRLINE_COLORS, getAirlineCodeFromName } from './airlineColors';

// Helper to get airline name from code (for airport topCarrier matching)
function getAirlineNameFromCode(code: string): string {
  const names: Record<string, string> = {
    'B6': 'JetBlue',
    'DL': 'Delta',
    'AA': 'American',
    'UA': 'United',
    'AS': 'Alaska',
    'WN': 'Southwest',
    'NK': 'Spirit',
    'F9': 'Frontier',
    'SY': 'Sun Country',
    'G4': 'Allegiant',
  };
  return names[code] || code;
}

/**
 * Generate a curved arc between two points using a quadratic bezier curve
 * This creates the visual "arc" effect for flight routes
 * 
 * Optimized: Adaptive point count based on distance and total route count
 */
export function generateArc(
  start: [number, number],
  end: [number, number],
  numPoints?: number,
  adaptive?: boolean
): [number, number][] {
  const points: [number, number][] = [];
  
  // Calculate the midpoint
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  
  // Calculate the distance for curve height
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Adaptive point count: fewer points for shorter distances or when rendering many routes
  let pointCount = numPoints ?? 50;
  
  if (adaptive) {
    // Adaptive point count based on distance
    // Optimized for performance: fewer points for faster rendering
    // Shorter routes need fewer points, longer routes need more
    // Range: 12-35 points (reduced from 15-50 for better performance)
    pointCount = Math.max(12, Math.min(35, Math.floor(distance * 80)));
  }
  
  // Control point offset (perpendicular to the line, scaled by distance)
  // The 0.2 factor controls how curved the arc is
  const curveHeight = distance * 0.2;
  
  // Calculate perpendicular direction (rotate 90 degrees)
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Control point for the quadratic bezier
  const controlX = midX + perpX * curveHeight;
  const controlY = midY + perpY * curveHeight;
  
  // Generate points along the bezier curve
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    
    // Quadratic bezier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = Math.pow(1 - t, 2) * start[0] + 
              2 * (1 - t) * t * controlX + 
              Math.pow(t, 2) * end[0];
    const y = Math.pow(1 - t, 2) * start[1] + 
              2 * (1 - t) * t * controlY + 
              Math.pow(t, 2) * end[1];
    
    points.push([x, y]);
  }
  
  return points;
}

/**
 * Convert route rankings to GeoJSON for Mapbox
 * Now includes airline information for colored routes
 * 
 * Optimized: Adaptive point count for better performance with many routes
 */
export function routesToGeoJSON(
  routes: RouteRanking[],
  maxPassengers: number,
  flightRoutes?: FlightRoute[] // Optional: individual flight routes for airline coloring
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  // Use adaptive point count when rendering many routes (optimize for 20+ routes)
  // Fewer points = faster rendering, but still smooth curves
  const useAdaptive = routes.length > 20;
  
  // Pre-build flight routes map for O(1) lookup instead of O(n) filter
  const flightRoutesMap = new Map<string, FlightRoute[]>();
  if (flightRoutes) {
    flightRoutes.forEach(fr => {
      const existing = flightRoutesMap.get(fr.destinationCode) || [];
      existing.push(fr);
      flightRoutesMap.set(fr.destinationCode, existing);
    });
  }
  
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = routes.map((route, index) => {
    const destination: [number, number] = [route.destinationLon, route.destinationLat];
    
    // Use adaptive point count for better performance
    const arcPoints = generateArc(JFK_COORDINATES, destination, undefined, useAdaptive);
    
    // Normalize passenger count for styling (0-1 range)
    const normalizedPassengers = maxPassengers > 0 
      ? route.passengers / maxPassengers 
      : 0;
    
    // Get airline info from flightRoutes map (O(1) lookup)
    const routeFlights = flightRoutesMap.get(route.destinationCode) || [];
    
    // Get primary carrier code - try to find from flightRoutes first, then convert name to code
    let primaryCarrierCode = '';
    if (routeFlights.length > 0) {
      const matchingFlight = routeFlights.find(fr => fr.carrier === route.primaryCarrier);
      primaryCarrierCode = matchingFlight?.carrierCode || '';
    }
    
    // If still no code, convert airline name to code using utility function
    if (!primaryCarrierCode && route.primaryCarrier) {
      primaryCarrierCode = getAirlineCodeFromName(route.primaryCarrier);
    }
    
    return {
      type: 'Feature',
      properties: {
        id: route.id,
        destinationCode: route.destinationCode,
        destinationName: route.destinationName,
        destinationCity: route.destinationCity,
        destinationState: route.destinationState,
        destinationStateCode: route.destinationStateCode,
        passengers: route.passengers,
        flights: route.flights,
        distance: route.distanceMiles,
        avgPerFlight: route.avgPassengersPerFlight,
        primaryCarrier: route.primaryCarrier,
        primaryCarrierCode: primaryCarrierCode.toUpperCase(), // Ensure uppercase for consistent matching
        normalizedPassengers,
        rank: index + 1,
      },
      geometry: {
        type: 'LineString',
        coordinates: arcPoints,
      },
    };
  });
  
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Generate airports GeoJSON from routes
 * Aggregates by destination airport
 */
export function routesToAirportsGeoJSON(
  routes: RouteRanking[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  // Aggregate by destination airport
  const airportMap = new Map<string, {
    code: string;
    name: string;
    city: string;
    state: string;
    stateCode: string;
    lat: number;
    lon: number;
    totalPassengers: number;
    totalFlights: number;
    topCarrier: string;
  }>();

  routes.forEach(route => {
    const existing = airportMap.get(route.destinationCode);
    if (existing) {
      existing.totalPassengers += route.passengers;
      existing.totalFlights += route.flights;
    } else {
      airportMap.set(route.destinationCode, {
        code: route.destinationCode,
        name: route.destinationName,
        city: route.destinationCity,
        state: route.destinationState,
        stateCode: route.destinationStateCode,
        lat: route.destinationLat,
        lon: route.destinationLon,
        totalPassengers: route.passengers,
        totalFlights: route.flights,
        topCarrier: route.primaryCarrier,
      });
    }
  });

  const features: GeoJSON.Feature<GeoJSON.Point>[] = Array.from(airportMap.values()).map(airport => {
    // Extract carrier code from topCarrier name (simple heuristic)
    // In production, you'd want to pass carrierCode directly
    const topCarrierCode = airport.topCarrier 
      ? Object.keys(AIRLINE_COLORS).find(code => 
          airport.topCarrier.toLowerCase().includes(code.toLowerCase()) ||
          airport.topCarrier.toLowerCase().includes(getAirlineNameFromCode(code).toLowerCase())
        ) || null
      : null;
    
    return {
      type: 'Feature',
      properties: {
        iata: airport.code,
        name: airport.name,
        city: airport.city,
        state: airport.state,
        stateCode: airport.stateCode,
        totalPassengers: airport.totalPassengers,
        totalFlights: airport.totalFlights,
        topCarrier: airport.topCarrier,
        topCarrierCode: topCarrierCode,
      },
      geometry: {
        type: 'Point',
        coordinates: [airport.lon, airport.lat],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Get point along a LineString at a given progress (0-1)
 */
export function getPointAlongLine(
  coordinates: [number, number][],
  progress: number
): [number, number] {
  if (coordinates.length === 0) return [0, 0];
  if (progress <= 0) return coordinates[0];
  if (progress >= 1) return coordinates[coordinates.length - 1];

  const totalLength = coordinates.length - 1;
  const exactIndex = progress * totalLength;
  const index = Math.floor(exactIndex);
  const t = exactIndex - index;

  const start = coordinates[index];
  const end = coordinates[index + 1] || start;

  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}

/**
 * Create GeoJSON point for JFK marker
 */
export function createJFKMarker(): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    properties: {
      name: 'JFK International Airport',
      code: 'JFK',
    },
    geometry: {
      type: 'Point',
      coordinates: JFK_COORDINATES,
    },
  };
}
