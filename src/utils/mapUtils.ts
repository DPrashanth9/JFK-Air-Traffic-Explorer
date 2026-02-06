import type { RouteRanking, FlightRoute } from '../types';
import { JFK_COORDINATES } from './constants';
import { AIRLINE_COLORS } from './airlineColors';

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
 */
export function generateArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];
  
  // Calculate the midpoint
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  
  // Calculate the distance for curve height
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const distance = Math.sqrt(dx * dx + dy * dy);
  
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
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    
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
 */
export function routesToGeoJSON(
  routes: RouteRanking[],
  maxPassengers: number,
  flightRoutes?: FlightRoute[] // Optional: individual flight routes for airline coloring
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = routes.map((route, index) => {
    const destination: [number, number] = [route.destinationLon, route.destinationLat];
    const arcPoints = generateArc(JFK_COORDINATES, destination);
    
    // Normalize passenger count for styling (0-1 range)
    const normalizedPassengers = maxPassengers > 0 
      ? route.passengers / maxPassengers 
      : 0;
    
    // Get airline info from flightRoutes if available
    const routeFlights = flightRoutes?.filter(
      fr => fr.destinationCode === route.destinationCode
    ) || [];
    
    // Get primary carrier code
    const primaryCarrierCode = routeFlights.length > 0
      ? routeFlights.find(fr => fr.carrier === route.primaryCarrier)?.carrierCode || ''
      : '';
    
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
        primaryCarrierCode: primaryCarrierCode,
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
