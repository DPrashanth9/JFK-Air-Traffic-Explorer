import { useState, useEffect } from 'react';
import type { RouteMode } from '../../types';
import { ROUTE_CONFIG, DEBOUNCE_DELAY } from '../../utils/constants';

interface MapControlsProps {
  routeMode: RouteMode;
  topNRoutes: number;
  totalRoutes: number;
  onRouteModeChange: (mode: RouteMode) => void;
  onTopNChange: (n: number) => void;
  // New toggles
  colorByAirline: boolean;
  animateFlights: boolean;
  onColorByAirlineChange: (enabled: boolean) => void;
  onAnimateFlightsChange: (enabled: boolean) => void;
}

export function MapControls({
  routeMode,
  topNRoutes,
  totalRoutes,
  onRouteModeChange,
  onTopNChange,
  colorByAirline,
  animateFlights,
  onColorByAirlineChange,
  onAnimateFlightsChange,
}: MapControlsProps) {
  const [localTopN, setLocalTopN] = useState(topNRoutes);
  const [isMinimized, setIsMinimized] = useState(false);

  // Sync local state when prop changes
  useEffect(() => {
    setLocalTopN(topNRoutes);
  }, [topNRoutes]);

  // Debounced update to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localTopN !== topNRoutes) {
        onTopNChange(localTopN);
      }
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [localTopN, topNRoutes, onTopNChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTopN(parseInt(e.target.value, 10));
  };

  return (
    <>
      {/* Minimized Tab */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-panel-light/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-xl border border-gray-700 z-10 hover:bg-panel-light transition-colors group"
          aria-label="Expand map controls"
          title="Expand map controls"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
              Controls
            </span>
          </div>
        </button>
      )}

      {/* Main Controls Panel */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 bg-panel-light/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 z-10 transition-all duration-300 ease-in-out ${
          isMinimized ? 'w-0 h-0 overflow-hidden opacity-0' : 'p-4 min-w-[600px] opacity-100'
        }`}
      >
        {/* Header with minimize button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4 flex-1">
            {/* Main Route Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Routes:</span>
              <div className="flex bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => onRouteModeChange('top')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    routeMode === 'top'
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Top {localTopN}
                </button>
                <button
                  onClick={() => onRouteModeChange('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    routeMode === 'all'
                      ? 'bg-accent text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({totalRoutes})
                </button>
              </div>
            </div>
            
            {routeMode === 'top' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{ROUTE_CONFIG.minTopN}</span>
                <input
                  type="range"
                  min={ROUTE_CONFIG.minTopN}
                  max={Math.min(ROUTE_CONFIG.maxTopN, totalRoutes)}
                  value={localTopN}
                  onChange={handleSliderChange}
                  className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <span className="text-xs text-gray-500">{Math.min(ROUTE_CONFIG.maxTopN, totalRoutes)}</span>
              </div>
            )}
          </div>
          
          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="ml-2 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            aria-label="Minimize controls"
            title="Minimize controls"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Toggle Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={colorByAirline}
              onChange={(e) => onColorByAirlineChange(e.target.checked)}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="text-xs text-gray-300">Color by airline</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={animateFlights}
              onChange={(e) => onAnimateFlightsChange(e.target.checked)}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="text-xs text-gray-300">Animate flights</span>
          </label>
          
        </div>

        {/* Instructions */}
        <p className="text-xs text-gray-500 mt-2">
          Click an airport to focus routes. Hover routes for details.
        </p>
      </div>
    </>
  );
}
