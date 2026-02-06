import { formatNumber, formatPercent } from '../../utils/formatters';

interface RankedItem {
  name: string;
  value: number;
  share: number;
  id?: string;
}

interface RankedListProps {
  title: string;
  items: RankedItem[];
  maxItems?: number;
  onItemClick?: (item: RankedItem) => void;
  highlightedItem?: string | null;
  valueLabel?: string;
}

export function RankedList({
  title,
  items,
  maxItems = 10,
  onItemClick,
  highlightedItem,
  valueLabel = 'passengers',
}: RankedListProps) {
  const displayItems = items.slice(0, maxItems);
  const maxValue = displayItems.length > 0 ? displayItems[0].value : 0;

  return (
    <div className="bg-panel-light rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
        {title}
      </h3>
      
      {displayItems.length === 0 ? (
        <p className="text-gray-400 text-sm">No data available</p>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item, index) => {
            const isHighlighted = highlightedItem === item.name;
            const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            
            return (
              <button
                key={item.id || item.name}
                onClick={() => onItemClick?.(item)}
                className={`w-full text-left group transition-all duration-150 ${
                  onItemClick ? 'cursor-pointer hover:bg-gray-700/50' : 'cursor-default'
                } ${isHighlighted ? 'bg-accent/20 ring-1 ring-accent' : ''} rounded-md p-2 -mx-2`}
                disabled={!onItemClick}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-500 text-xs font-medium w-5 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span 
                      className={`text-sm font-medium truncate ${
                        isHighlighted ? 'text-accent' : 'text-white'
                      }`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-400">
                      {formatNumber(item.value)}
                    </span>
                    <span className="text-xs font-medium text-accent w-12 text-right">
                      {formatPercent(item.share)}
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="ml-7 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHighlighted ? 'bg-accent' : 'bg-accent/60'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {items.length > maxItems && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          + {items.length - maxItems} more {valueLabel === 'passengers' ? 'destinations' : 'airlines'}
        </p>
      )}
    </div>
  );
}
