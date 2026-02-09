import { useState, useCallback, useMemo } from 'react';
import { useFlightData } from './hooks/useFlightData';
import { useAggregations } from './hooks/useAggregations';
import { useFunFacts } from './hooks/useFunFacts';
import { AnalyticsPanel } from './components/Panel/AnalyticsPanel';
import { MapView } from './components/Map/MapView';
import { DestinationBarChart } from './components/Charts/DestinationBarChart';
import { AirlineDonutChart } from './components/Charts/AirlineDonutChart';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ErrorMessage } from './components/common/ErrorMessage';
import { ROUTE_CONFIG } from './utils/constants';
import { calculateQuantileBreaks } from './utils/quantileBreaks';
import type { RouteMode } from './types';

function App() {
  // Data and filtering
  const {
    filteredRoutes,
    filters,
    setMonth,
    setAirline,
    setState,
    resetFilters,
    availableMonths,
    availableAirlines,
    availableStates,
    isLoading: dataLoading,
    error: dataError,
  } = useFlightData();

  // Computed aggregations
  const aggregations = useAggregations({
    month: filters.month,
    airline: filters.airline,
    state: filters.state,
  });

  // Fun facts
  const funFacts = useFunFacts(aggregations);

  // Calculate quantile breaks for passenger density legend
  const quantileBreaks = useMemo(() => {
    const passengerValues = aggregations.stateRankings.map(r => r.passengers);
    return calculateQuantileBreaks(passengerValues, 5);
  }, [aggregations.stateRankings]);

  // Route display state
  const [routeMode, setRouteMode] = useState<RouteMode>('top');
  const [topNRoutes, setTopNRoutes] = useState(ROUTE_CONFIG.defaultTopN);

  // Highlight state
  const [highlightedState, setHighlightedState] = useState<string | null>(null);
  const [highlightedAirline, setHighlightedAirline] = useState<string | null>(null);

  // Handle state click from map or list
  const handleStateClick = useCallback((stateName: string) => {
    if (filters.state === stateName) {
      // If already filtered by this state, clear the filter
      setState(null);
      setHighlightedState(null);
    } else {
      // Filter by this state
      setState(stateName);
      setHighlightedState(stateName);
    }
  }, [filters.state, setState]);

  // Handle airline click from list
  const handleAirlineClick = useCallback((airlineName: string) => {
    // Find the carrier code for this airline name
    const airlineRanking = aggregations.airlineRankings.find(r => r.carrier === airlineName);
    const carrierCode = airlineRanking?.carrierCode || null;
    
    if (filters.airline === airlineName) {
      // If already filtered by this airline, clear the filter
      setAirline(null);
      setHighlightedAirline(null);
    } else {
      // Filter by this airline (use name for filter, code for highlighting)
      setAirline(airlineName);
      // Use carrier code for map highlighting - this ensures routes are properly highlighted
      setHighlightedAirline(carrierCode);
    }
  }, [filters.airline, setAirline, aggregations.airlineRankings]);

  // Handle filter reset
  const handleReset = useCallback(() => {
    resetFilters();
    setHighlightedState(null);
    setHighlightedAirline(null);
  }, [resetFilters]);

  // Handle state filter change from dropdown
  const handleStateChange = useCallback((state: string | null) => {
    setState(state);
    setHighlightedState(state);
  }, [setState]);

  // Handle airline filter change from dropdown
  const handleAirlineChange = useCallback((airline: string | null) => {
    setAirline(airline);
    setHighlightedAirline(airline);
  }, [setAirline]);

  // Show loading or error state
  if (dataLoading && availableMonths.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-panel">
        <LoadingSpinner message="Loading flight data..." />
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-panel p-4 sm:p-8">
        <ErrorMessage 
          message={dataError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden bg-panel">
      {/* Left Panel - Analytics */}
      <div className="flex flex-col h-full w-full lg:w-auto lg:min-w-[380px] max-w-full overflow-hidden">
        <AnalyticsPanel
          aggregations={aggregations}
          funFacts={funFacts}
          filters={filters}
          availableMonths={availableMonths}
          availableAirlines={availableAirlines}
          availableStates={availableStates}
          onMonthChange={setMonth}
          onAirlineChange={handleAirlineChange}
          onStateChange={handleStateChange}
          onReset={handleReset}
          onStateClick={handleStateClick}
          onAirlineClick={handleAirlineClick}
          highlightedState={highlightedState}
          highlightedAirline={highlightedAirline}
          quantileBreaks={quantileBreaks}
        />
      </div>

      {/* Right Side - Map and Charts */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Main Map */}
        <div className="flex-1 relative min-h-[400px]">
          <MapView
            routeRankings={aggregations.routeRankings}
            stateRankings={aggregations.stateRankings}
            routeMode={routeMode}
            topNRoutes={topNRoutes}
            onRouteModeChange={setRouteMode}
            onTopNChange={setTopNRoutes}
            highlightedState={highlightedState}
            highlightedAirline={highlightedAirline}
            onStateClick={handleStateClick}
            onAirlineClick={(code) => {
              if (code === highlightedAirline || code === '') {
                setHighlightedAirline(null);
              } else {
                setHighlightedAirline(code);
              }
            }}
            flightRoutes={filteredRoutes}
          />
        </div>

        {/* Bottom Charts */}
        <div className="h-72 bg-panel border-t border-gray-800 p-2 sm:p-4 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 h-full">
            <DestinationBarChart
              stateRankings={aggregations.stateRankings}
              maxItems={10}
              highlightedState={highlightedState}
              onStateClick={handleStateClick}
            />
            <AirlineDonutChart
              airlineRankings={aggregations.airlineRankings}
              maxItems={5}
              highlightedAirline={highlightedAirline}
              onAirlineClick={handleAirlineClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
