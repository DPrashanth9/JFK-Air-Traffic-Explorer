import { formatMonthDisplay } from '../../utils/formatters';

interface DataNoteProps {
  currentMonth: string;
}

export function DataNote({ currentMonth }: DataNoteProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-start gap-2">
        <span className="text-gray-400 text-sm">📋</span>
        <div>
          <p className="text-xs text-gray-400 leading-relaxed">
            <span className="font-medium text-gray-300">Data Note:</span> This dashboard shows 
            monthly aggregated domestic passenger traffic from JFK. Aviation data is typically 
            released with a 2-month reporting lag.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Most recent available: <span className="text-gray-400">{formatMonthDisplay(currentMonth)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
