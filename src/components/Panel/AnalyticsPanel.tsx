import { useState } from 'react';
import type { Aggregations, FunFact, FilterState } from '../../types';
import { StatCard } from './StatCard';
import { FilterControls } from './FilterControls';
import { RankedList } from './RankedList';
import { FunFacts } from './FunFacts';
import { DataNote } from './DataNote';
import { formatCompactNumber, formatNumber } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

interface AnalyticsPanelProps {
  aggregations: Aggregations;
  funFacts: FunFact[];
  filters: FilterState;
  
  // Filter options
  availableMonths: string[];
  availableAirlines: string[];
  availableStates: string[];
  
  // Filter handlers
  onMonthChange: (month: string) => void;
  onAirlineChange: (airline: string | null) => void;
  onStateChange: (state: string | null) => void;
  onReset: () => void;
  
  // Interaction handlers
  onStateClick?: (state: string) => void;
  onAirlineClick?: (airline: string) => void;
  highlightedState?: string | null;
  highlightedAirline?: string | null;
  
  // Passenger density legend
  quantileBreaks?: number[];
}

export function AnalyticsPanel({
  aggregations,
  funFacts,
  filters,
  availableMonths,
  availableAirlines,
  availableStates,
  onMonthChange,
  onAirlineChange,
  onStateChange,
  onReset,
  onStateClick,
  onAirlineClick,
  highlightedState,
  highlightedAirline,
  quantileBreaks = [],
}: AnalyticsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const {
    totalPassengers,
    uniqueStates,
    avgPassengersPerFlight,
    topState,
    topAirline,
    stateRankings,
    airlineRankings,
    comparison,
  } = aggregations;

  // Convert rankings to RankedList format
  const stateItems = stateRankings.map(r => ({
    name: r.state,
    value: r.passengers,
    share: r.share,
    id: r.stateCode,
  }));

  const airlineItems = airlineRankings.map(r => ({
    name: r.carrier,
    value: r.passengers,
    share: r.share,
    id: r.carrierCode,
  }));

  return (
    <>
      {/* Minimized Tab */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-panel border-r border-gray-800 h-full w-10 lg:w-14 flex flex-col items-center justify-center hover:bg-panel-light transition-colors group"
          aria-label="Expand insights panel"
          title="Expand insights panel"
        >
          <div className="transform -rotate-90 whitespace-nowrap mb-2">
            <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
              Insights
            </span>
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Panel */}
      <div
        className={`bg-panel h-full flex flex-col border-r border-gray-800 transition-all duration-300 ease-in-out ${
          isMinimized ? 'w-0 overflow-hidden' : 'w-full lg:w-80'
        }`}
      >
        {/* Header with minimize button */}
        <div className="p-3 sm:p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              JFK Air Traffic Explorer
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
              Domestic passenger traffic analysis
            </p>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="ml-4 p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            aria-label="Minimize panel"
            title="Minimize panel"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto panel-scroll">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Filters */}
          <FilterControls
            selectedMonth={filters.month}
            availableMonths={availableMonths}
            onMonthChange={onMonthChange}
            selectedAirline={filters.airline}
            availableAirlines={availableAirlines}
            onAirlineChange={onAirlineChange}
            selectedState={filters.state}
            availableStates={availableStates}
            onStateChange={onStateChange}
            onReset={onReset}
          />

          {/* Passenger Density Legend */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Passenger Density (Selected Month)
            </h4>
            <div className="flex items-center gap-1">
              {COLORS.choropleth.map((color, i) => (
                <div
                  key={i}
                  className="w-6 h-3 first:rounded-l last:rounded-r"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">Low</span>
              <span className="text-xs text-gray-500">High</span>
            </div>
            {quantileBreaks.length > 1 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 space-y-0.5">
                  {quantileBreaks.slice(1).map((breakVal, i) => (
                    <div key={i} className="flex justify-between">
                      <span>Q{i + 1}:</span>
                      <span className="text-gray-800 font-medium">{formatNumber(Math.round(breakVal))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stat Cards - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Passengers"
              value={formatCompactNumber(totalPassengers)}
              change={comparison.passengerChange}
            />
            <StatCard
              label="States Reached"
              value={uniqueStates.toString()}
            />
            <StatCard
              label="Top Destination"
              value={topState?.stateCode || '—'}
              sublabel={topState ? `${topState.name} (${topState.share}%)` : undefined}
            />
            <StatCard
              label="Top Airline"
              value={topAirline?.carrierCode || '—'}
              sublabel={topAirline ? `${topAirline.name} (${topAirline.share}%)` : undefined}
            />
          </div>

          {/* Additional stat */}
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Avg. Passengers/Flight
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatNumber(avgPassengersPerFlight)}
              </span>
            </div>
          </div>

          {/* Fun Facts */}
          <FunFacts facts={funFacts} />

          {/* State Rankings */}
          <RankedList
            title="Top Destination States"
            items={stateItems}
            maxItems={10}
            onItemClick={(item) => onStateClick?.(item.name)}
            highlightedItem={highlightedState}
            valueLabel="passengers"
          />

          {/* Airline Rankings */}
          <RankedList
            title="Top Airlines"
            items={airlineItems}
            maxItems={10}
            onItemClick={(item) => onAirlineClick?.(item.name)}
            highlightedItem={highlightedAirline}
            valueLabel="flights"
          />

          {/* Data Note */}
          <DataNote currentMonth={filters.month} />
        </div>
        </div>
      </div>
    </>
  );
}
