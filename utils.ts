
export const formatNumber = (num: number): string => {
  if (num === null || num === undefined) return '—';
  return num.toLocaleString('en-US');
};

export const shortFormatNumber = (num: number): string => {
    if (num === null || num === undefined) return '—';
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
};

export const formatPercentage = (num: number, fractionDigits = 2): string => {
    if (num === null || num === undefined) return '—';
    return `${(num * 100).toFixed(fractionDigits)}%`;
};

export const formatDecimal = (num?: number, fractionDigits = 1): string => {
  if (num === null || num === undefined) return '—';
  return num.toFixed(fractionDigits);
}

export const calculateGrowth = (current: number, previous: number): string => {
    if (previous === 0) {
        return '—';
    }
    const percentage = ((current - previous) / previous);
    return formatPercentage(percentage, 1);
};

export const getGrowthType = (change: string): 'increase' | 'decrease' | 'neutral' => {
  if (change === '—' || change.startsWith('0.0')) return 'neutral';
  return change.startsWith('-') ? 'decrease' : 'increase';
};

export const extractAuthorFromUrl = (url: string): string => {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Example patterns - customize for real-world scenarios
    if (segments.includes('author') && segments.indexOf('author') + 1 < segments.length) {
      return capitalize(segments[segments.indexOf('author') + 1]);
    }
    if (segments.includes('by') && segments.indexOf('by') + 1 < segments.length) {
      return capitalize(segments[segments.indexOf('by') + 1]);
    }
    // Fallback if no specific pattern matches
    return 'Unknown Author';
  } catch (e) {
    return 'Unknown Author';
  }
};

const capitalize = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
