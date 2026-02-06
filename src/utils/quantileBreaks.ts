/**
 * Calculate quantile breaks for choropleth coloring
 * Returns break points that divide data into equal-sized buckets
 */
export function calculateQuantileBreaks(
  values: number[],
  numBreaks: number = 5
): number[] {
  if (values.length === 0) {
    return Array(numBreaks + 1).fill(0);
  }

  // Filter out zero values and sort
  const nonZeroValues = values.filter(v => v > 0).sort((a, b) => a - b);
  
  if (nonZeroValues.length === 0) {
    return Array(numBreaks + 1).fill(0);
  }

  const breaks: number[] = [0]; // Always start at 0

  // Calculate quantile breaks
  for (let i = 1; i <= numBreaks; i++) {
    const quantile = i / numBreaks;
    const index = Math.floor((nonZeroValues.length - 1) * quantile);
    breaks.push(nonZeroValues[index] || 0);
  }

  // Ensure breaks are unique and sorted
  const uniqueBreaks = [...new Set(breaks)].sort((a, b) => a - b);
  
  // If we have fewer breaks than needed, pad with max value
  while (uniqueBreaks.length < numBreaks + 1) {
    uniqueBreaks.push(nonZeroValues[nonZeroValues.length - 1] || 0);
  }

  return uniqueBreaks;
}

/**
 * Get quantile bucket index for a value
 */
export function getQuantileBucket(
  value: number,
  breaks: number[]
): number {
  if (value <= 0) return 0;
  
  for (let i = breaks.length - 1; i >= 0; i--) {
    if (value >= breaks[i]) {
      return Math.min(i, breaks.length - 2); // Return bucket index (0 to numBreaks-1)
    }
  }
  
  return 0;
}
