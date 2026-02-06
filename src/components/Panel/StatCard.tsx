import { COLORS } from '../../utils/constants';
import { formatChange } from '../../utils/formatters';

interface StatCardProps {
  label: string;
  value: string;
  change?: number | null;
  sublabel?: string;
  icon?: string;
}

export function StatCard({ label, value, change, sublabel, icon }: StatCardProps) {
  const getChangeColor = () => {
    if (change === null || change === undefined) return COLORS.neutral;
    return change >= 0 ? COLORS.positive : COLORS.negative;
  };

  const getChangeIcon = () => {
    if (change === null || change === undefined) return '';
    return change >= 0 ? '↑' : '↓';
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {icon && <span className="mr-1">{icon}</span>}
            {value}
          </p>
          {sublabel && (
            <p className="text-sm text-gray-600 mt-1 truncate" title={sublabel}>
              {sublabel}
            </p>
          )}
        </div>
        {change !== undefined && (
          <div 
            className="flex items-center text-sm font-medium ml-2"
            style={{ color: getChangeColor() }}
          >
            <span>{getChangeIcon()}</span>
            <span className="ml-0.5">{formatChange(change)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
