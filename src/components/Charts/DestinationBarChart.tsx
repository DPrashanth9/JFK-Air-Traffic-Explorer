import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { StateRanking } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

interface DestinationBarChartProps {
  stateRankings: StateRanking[];
  maxItems?: number;
  highlightedState?: string | null;
  onStateClick?: (state: string) => void;
}

export function DestinationBarChart({
  stateRankings,
  maxItems = 10,
  highlightedState,
  onStateClick,
}: DestinationBarChartProps) {
  const data = stateRankings.slice(0, maxItems).map(r => ({
    name: r.stateCode,
    fullName: r.state,
    passengers: r.passengers,
    share: r.share,
  }));

  if (data.length === 0) {
    return (
      <div className="bg-panel-light rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
          Top Destinations
        </h3>
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-panel-light rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
        Top Destinations by Passengers
      </h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => formatCompactNumber(value)}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#e5e7eb', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-700">
                    <p className="text-white font-medium text-sm">{data.fullName}</p>
                    <p className="text-gray-300 text-xs mt-1">
                      {formatCompactNumber(data.passengers)} passengers ({data.share}%)
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="passengers"
              radius={[0, 4, 4, 0]}
              onClick={(data) => onStateClick?.(data.fullName)}
              style={{ cursor: onStateClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fullName === highlightedState ? COLORS.routeArc : 'rgba(96, 165, 250, 0.6)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
