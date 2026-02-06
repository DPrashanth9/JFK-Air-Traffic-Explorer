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
export const AIRLINE_COLORS: Record<string, string> = {
  'B6': '#0066CC', // JetBlue - Bright Blue
  'DL': '#C41E3A', // Delta - Red
  'AA': '#1E3A8A', // American - Deep Navy
  'UA': '#00A1E4', // United - Cyan Blue
  'AS': '#002244', // Alaska - Dark Blue
  'WN': '#FFC72C', // Southwest - Bright Yellow
  'NK': '#FFD100', // Spirit - Golden Yellow
  'F9': '#7B68EE', // Frontier - Medium Slate Blue
  'SY': '#FF4500', // Sun Country - Orange Red
  'G4': '#FF6600', // Allegiant - Orange
  'HA': '#00A1E4', // Hawaiian - Sky Blue
  'VX': '#FF1493', // Virgin America - Deep Pink
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
