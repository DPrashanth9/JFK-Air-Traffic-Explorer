// JFK Airport coordinates
export const JFK_COORDINATES: [number, number] = [-73.7781, 40.6413];

// Map configuration
export const MAP_CONFIG = {
  style: 'mapbox://styles/prashanth09/cml79hvzz004h01qo2cyzb2og',
  initialCenter: [-98.5795, 39.8283] as [number, number], // Center of US
  initialZoom: 3.5,
  minZoom: 2,
  maxZoom: 12,
};

// Airline colors moved to src/utils/airlineColors.ts for single source of truth
// Import from there instead
export { AIRLINE_COLORS, DEFAULT_AIRLINE_COLOR, OTHERS_COLOR, getAirlineColor } from './airlineColors';

// Color scales
export const COLORS = {
  // Choropleth gradient (light to dark blue) - 5 buckets for quantile
  choropleth: [
    '#dbeafe', // Very Low
    '#93c5fd', // Low
    '#60a5fa', // Medium
    '#3b82f6', // High
    '#1e40af', // Very High
  ],
  // Route arc color (base routes)
  routeArc: '#60a5fa',
  routeArcBase: 'rgba(96, 165, 250, 0.2)', // Base routes (low opacity)
  // JFK marker
  jfkMarker: '#f97316',
  // Airport markers
  airportMarker: '#8b5cf6',
  airportMarkerHover: '#a78bfa',
  // Animated flight symbol
  flightSymbol: '#ffffff',
  // Change indicators
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
  // Panel
  panelBg: '#0f172a',
  panelLight: '#1e293b',
  cardBg: '#ffffff',
  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
};

// Route visualization settings
export const ROUTE_CONFIG = {
  minOpacity: 0.3,
  maxOpacity: 0.9,
  minWidth: 1,
  maxWidth: 4,
  defaultTopN: 25,
  minTopN: 10,
  maxTopN: 100,
};

// Debounce delay for slider (ms)
export const DEBOUNCE_DELAY = 150;
