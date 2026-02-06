import { AIRLINE_COLORS, DEFAULT_AIRLINE_COLOR } from './airlineColors';

/**
 * Generate Mapbox match expression for airline colors
 * Returns expression array for use in Mapbox paint properties
 * 
 * Usage:
 * map.setPaintProperty('layer-id', 'line-color', getAirlineColorMatchExpression());
 */
export function getAirlineColorMatchExpression(): any[] {
  // Build match expression: ['match', ['get', 'primaryCarrierCode'], ...]
  const expression: any[] = ['match', ['get', 'primaryCarrierCode']];
  
  // Add all airline color mappings
  Object.entries(AIRLINE_COLORS).forEach(([code, color]) => {
    expression.push(code, color);
  });
  
  // Default fallback
  expression.push(DEFAULT_AIRLINE_COLOR);
  
  return expression;
}

/**
 * Generate Mapbox match expression for circle colors (for airports/animation)
 */
export function getAirlineCircleColorMatchExpression(property: string = 'carrierCode'): any[] {
  const expression: any[] = ['match', ['get', property]];
  
  Object.entries(AIRLINE_COLORS).forEach(([code, color]) => {
    expression.push(code, color);
  });
  
  expression.push(DEFAULT_AIRLINE_COLOR);
  
  return expression;
}
