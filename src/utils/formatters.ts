/**
 * Format a number with commas (e.g., 1234567 -> "1,234,567")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format a large number with abbreviation (e.g., 1234567 -> "1.2M")
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format a percentage with one decimal place
 */
export function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

/**
 * Format a change percentage with + or - prefix
 */
export function formatChange(change: number | null): string {
  if (change === null) return '—';
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change.toFixed(1)}%`;
}

/**
 * Format distance in miles
 */
export function formatDistance(miles: number): string {
  return `${formatNumber(Math.round(miles))} mi`;
}

/**
 * Format a month string (YYYY-MM) to display format
 */
export function formatMonthDisplay(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
}

/**
 * Format a month string (YYYY-MM) to short format (e.g., "Oct 2025")
 */
export function formatMonthShort(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
}
