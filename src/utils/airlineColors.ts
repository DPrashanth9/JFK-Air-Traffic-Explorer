/**
 * Single source of truth for airline colors
 * Used consistently across:
 * - Map route colors
 * - Donut chart slices
 * - Airport symbols
 * - Animation colors
 * - Legends
 */

// Distinct, high-contrast colors for maximum clarity
// Updated to reduce blue dominance for better map readability
export const AIRLINE_COLORS: Record<string, string> = {
  'B6': '#0066CC', // JetBlue - Bright Blue
  'DL': '#C41E3A', // Delta - Red
  'AA': '#1E3A8A', // American - Deep Navy
  'UA': '#8B5CF6', // United - Purple (changed from Cyan Blue)
  'AS': '#10B981', // Alaska - Green (changed from Dark Blue)
  'WN': '#FFC72C', // Southwest - Bright Yellow
  'NK': '#FFD100', // Spirit - Golden Yellow
  'F9': '#EC4899', // Frontier - Pink (changed from Medium Slate Blue)
  'SY': '#FF4500', // Sun Country - Orange Red
  'G4': '#FF6600', // Allegiant - Orange
  'HA': '#F59E0B', // Hawaiian - Amber/Orange (changed from Sky Blue)
  'VX': '#FF1493', // Virgin America - Deep Pink
};

// Display names for airline codes (custom short forms)
export const AIRLINE_DISPLAY_NAMES: Record<string, string> = {
  'B6': 'JB', // JetBlue
  'NK': 'SA', // Spirit Airlines
  'DL': 'DL', // Delta
  'AA': 'AA', // American
  'UA': 'UA', // United
  'AS': 'AS', // Alaska
  'WN': 'WN', // Southwest
  'F9': 'F9', // Frontier
  'SY': 'SY', // Sun Country
  'G4': 'G4', // Allegiant
  'HA': 'HA', // Hawaiian
  'VX': 'VX', // Virgin America
};

// Default color for unknown airlines
export const DEFAULT_AIRLINE_COLOR = '#60a5fa';

// Neutral gray for "Others" category
export const OTHERS_COLOR = '#6b7280';

/**
 * Get color for a carrier code
 */
export function getAirlineColor(carrierCode: string | null | undefined): string {
  if (!carrierCode) return DEFAULT_AIRLINE_COLOR;
  return AIRLINE_COLORS[carrierCode.toUpperCase()] || DEFAULT_AIRLINE_COLOR;
}

/**
 * Get all airline colors as an array for charts
 * Returns [code, color] pairs
 */
export function getAllAirlineColors(): Array<[string, string]> {
  return Object.entries(AIRLINE_COLORS);
}

/**
 * Get display name for a carrier code
 * Returns custom short form if available, otherwise returns the code itself
 */
export function getAirlineDisplayName(carrierCode: string | null | undefined): string {
  if (!carrierCode) return '';
  const upperCode = carrierCode.toUpperCase();
  return AIRLINE_DISPLAY_NAMES[upperCode] || upperCode;
}

/**
 * Convert airline name to carrier code
 * Used when we have airline name but need the code for matching
 */
export function getAirlineCodeFromName(airlineName: string | null | undefined): string {
  if (!airlineName) return '';
  
  // Map of common airline names to codes
  const nameToCode: Record<string, string> = {
    'JetBlue': 'B6',
    'JetBlue Airways': 'B6',
    'Delta Air Lines': 'DL',
    'Delta': 'DL',
    'American Airlines': 'AA',
    'American': 'AA',
    'United Airlines': 'UA',
    'United': 'UA',
    'Alaska Airlines': 'AS',
    'Alaska': 'AS',
    'Southwest Airlines': 'WN',
    'Southwest': 'WN',
    'Spirit Airlines': 'NK',
    'Spirit': 'NK',
    'Frontier Airlines': 'F9',
    'Frontier': 'F9',
    'Hawaiian Airlines': 'HA',
    'Hawaiian': 'HA',
    'Sun Country Airlines': 'SY',
    'Sun Country': 'SY',
    'Allegiant Air': 'G4',
    'Allegiant': 'G4',
    'Virgin America': 'VX',
  };
  
  return nameToCode[airlineName] || '';
}