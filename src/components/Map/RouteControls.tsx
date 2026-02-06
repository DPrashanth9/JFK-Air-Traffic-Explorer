import { useState, useEffect, useCallback } from 'react';
import { ROUTE_CONFIG, DEBOUNCE_DELAY } from '../../utils/constants';
import type { RouteMode } from '../../types';

interface RouteControlsProps {
  routeMode: RouteMode;
  topNRoutes: number;
  totalRoutes: number;
  onRouteModeChange: (mode: RouteMode) => void;
  onTopNChange: (n: number) => void;
}

export function RouteControls({
  routeMode,
  topNRoutes,
  totalRoutes,
  onRouteModeChange,
  onTopNChange,
}: RouteControlsProps) {
  // Local state for slider to enable smooth dragging
  const [localTopN, setLocalTopN] = useState(topNRoutes);
  
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
  
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTopN(parseInt(e.target.value, 10));
  }, []);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-panel-light/95 backdrop-blur-sm rounded-lg p-3 shadow-xl border border-gray-700 z-10">
      <div className="flex items-center gap-4">
        {/* Route Mode Toggle */}
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
        
        {/* Slider (only visible in "top" mode) */}
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
    </div>
  );
}
