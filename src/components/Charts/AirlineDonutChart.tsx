import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { AirlineRanking } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';
import { getAirlineColor, OTHERS_COLOR } from '../../utils/airlineColors';

interface AirlineDonutChartProps {
  airlineRankings: AirlineRanking[];
  maxItems?: number;
  highlightedAirline?: string | null;
  onAirlineClick?: (airline: string) => void;
}

export function AirlineDonutChart({
  airlineRankings,
  maxItems = 5,
  highlightedAirline,
  onAirlineClick,
}: AirlineDonutChartProps) {
  // Get top airlines and group the rest as "Others"
  const topAirlines = airlineRankings.slice(0, maxItems);
  const otherAirlines = airlineRankings.slice(maxItems);
  
  const othersTotal = otherAirlines.reduce((sum, a) => sum + a.passengers, 0);
  const othersShare = otherAirlines.reduce((sum, a) => sum + a.share, 0);
  
  const data = [
    ...topAirlines.map(r => ({
      name: r.carrier,
      value: r.passengers,
      share: r.share,
    })),
    ...(othersTotal > 0 ? [{
      name: 'Others',
      value: othersTotal,
      share: Math.round(othersShare * 10) / 10,
    }] : []),
  ];

  if (data.length === 0) {
    return (
      <div className="bg-panel-light rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
          Airline Market Share
        </h3>
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-panel-light rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
        Airline Market Share
      </h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              onClick={(data) => {
                if (data.name !== 'Others' && onAirlineClick) {
                  onAirlineClick(data.name);
                }
              }}
              style={{ cursor: onAirlineClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => {
                // Get color from airline color map if available, otherwise use Others color
                const airlineRanking = airlineRankings.find(r => r.carrier === entry.name);
                const color = entry.name === 'Others' 
                  ? OTHERS_COLOR 
                  : getAirlineColor(airlineRanking?.carrierCode);
                
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                    opacity={
                      highlightedAirline
                        ? entry.name === highlightedAirline
                          ? 1
                          : 0.4
                        : 1
                    }
                    stroke={entry.name === highlightedAirline ? '#ffffff' : 'transparent'}
                    strokeWidth={2}
                  />
                );
              })}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-700">
                    <p className="text-white font-medium text-sm">{data.name}</p>
                    <p className="text-gray-300 text-xs mt-1">
                      {formatCompactNumber(data.value)} passengers ({data.share}%)
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-gray-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
