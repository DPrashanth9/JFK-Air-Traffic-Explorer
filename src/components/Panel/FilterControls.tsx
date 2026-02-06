import { formatMonthDisplay } from '../../utils/formatters';

interface FilterControlsProps {
  // Month filter
  selectedMonth: string;
  availableMonths: string[];
  onMonthChange: (month: string) => void;
  
  // Airline filter
  selectedAirline: string | null;
  availableAirlines: string[];
  onAirlineChange: (airline: string | null) => void;
  
  // State filter
  selectedState: string | null;
  availableStates: string[];
  onStateChange: (state: string | null) => void;
  
  // Reset
  onReset: () => void;
}

export function FilterControls({
  selectedMonth,
  availableMonths,
  onMonthChange,
  selectedAirline,
  availableAirlines,
  onAirlineChange,
  selectedState,
  availableStates,
  onStateChange,
  onReset,
}: FilterControlsProps) {
  const hasActiveFilters = selectedAirline !== null || selectedState !== null;

  return (
    <div className="space-y-3">
      {/* Month Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
          Most Recent Available Month
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          className="w-full bg-panel-light border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {formatMonthDisplay(month)}
            </option>
          ))}
        </select>
      </div>

      {/* Two-column grid for airline and state */}
      <div className="grid grid-cols-2 gap-3">
        {/* Airline Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
            Airline
          </label>
          <select
            value={selectedAirline || ''}
            onChange={(e) => onAirlineChange(e.target.value || null)}
            className="w-full bg-panel-light border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="">All Airlines</option>
            {availableAirlines.map((airline) => (
              <option key={airline} value={airline}>
                {airline}
              </option>
            ))}
          </select>
        </div>

        {/* State Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
            State
          </label>
          <select
            value={selectedState || ''}
            onChange={(e) => onStateChange(e.target.value || null)}
            className="w-full bg-panel-light border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="">All States</option>
            {availableStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-150"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
