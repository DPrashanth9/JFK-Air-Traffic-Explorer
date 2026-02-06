import { useMemo } from 'react';
import type { Aggregations, FunFact } from '../types';

const MSG_CAPACITY = 20789; // Madison Square Garden capacity
const EARTH_CIRCUMFERENCE = 24901; // miles
const YANKEE_STADIUM_CAPACITY = 46537;
const EMPIRE_STATE_HEIGHT = 1454; // feet

export function useFunFacts(aggregations: Aggregations): FunFact[] {
  return useMemo(() => {
    const facts: FunFact[] = [];
    const { totalPassengers, totalFlights, totalMilesTraveled, uniqueAirports } = aggregations;
    
    // Only generate facts if we have meaningful data
    if (totalPassengers < 1000) {
      return [];
    }
    
    // Stadium comparison
    const msgFills = Math.round(totalPassengers / MSG_CAPACITY);
    if (msgFills >= 1) {
      facts.push({
        id: 'stadium',
        icon: '🏟️',
        text: 'Enough passengers to fill Madison Square Garden',
        value: `${msgFills.toLocaleString()} times`,
      });
    }
    
    // Earth trips comparison
    const earthTrips = Math.round((totalMilesTraveled / EARTH_CIRCUMFERENCE) * 10) / 10;
    if (earthTrips >= 1) {
      facts.push({
        id: 'earth',
        icon: '🌍',
        text: 'Total distance traveled equals',
        value: `${earthTrips.toLocaleString()} trips around Earth`,
      });
    }
    
    // Flight frequency (assuming 30 days in a month)
    const flightsPerDay = Math.round(totalFlights / 30);
    const minutesBetweenFlights = Math.round((24 * 60) / (totalFlights / 30) * 10) / 10;
    if (flightsPerDay > 10 && minutesBetweenFlights < 60) {
      facts.push({
        id: 'frequency',
        icon: '✈️',
        text: 'A flight takes off every',
        value: `${minutesBetweenFlights} minutes`,
      });
    }
    
    // Yankee Stadium alternative
    const yankeeFills = Math.round(totalPassengers / YANKEE_STADIUM_CAPACITY);
    if (yankeeFills >= 5 && facts.length < 3) {
      facts.push({
        id: 'yankee',
        icon: '⚾',
        text: 'Could fill Yankee Stadium',
        value: `${yankeeFills.toLocaleString()} times`,
      });
    }
    
    // Destinations fact
    if (uniqueAirports >= 20 && facts.length < 3) {
      facts.push({
        id: 'destinations',
        icon: '🗺️',
        text: 'Connecting JFK to',
        value: `${uniqueAirports} airports nationwide`,
      });
    }
    
    // Empire State Building comparison (if we have high miles)
    const empiresInMiles = Math.round(totalMilesTraveled * 5280 / EMPIRE_STATE_HEIGHT);
    if (empiresInMiles >= 1000000 && facts.length < 3) {
      facts.push({
        id: 'empire',
        icon: '🏙️',
        text: 'Distance stacked equals',
        value: `${(empiresInMiles / 1000000).toFixed(1)}M Empire State Buildings`,
      });
    }
    
    // Return only the top 3 facts
    return facts.slice(0, 3);
  }, [aggregations]);
}
