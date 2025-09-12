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
        if (current === 0) return '0%';
        return current > 0 ? '+100%' : '—';
    }
    const percentage = ((current - previous) / previous);
    const formatted = formatPercentage(percentage, 1);
    return percentage >= 0 ? `+${formatted}` : formatted;
};

export const getGrowthType = (change: string): 'increase' | 'decrease' | 'neutral' => {
  if (change === '—' || change === '0%' || change === '+0.0%' || change === '-0.0%') return 'neutral';
  return change.startsWith('-') ? 'decrease' : 'increase';
};

/**
 * Enhanced author extraction from URLs with common blog patterns
 */
export const extractAuthorFromUrl = (url: string): string => {
  try {
    let path: string;
    
    // Handle both full URLs and path-only strings
    if (url.startsWith('http://') || url.startsWith('https://')) {
      path = new URL(url).pathname;
    } else {
      path = url;
    }
    
    const segments = path.split('/').filter(Boolean);
    
    // Common author URL patterns
    const authorPatterns = [
      // /author/john-doe or /authors/john-doe
      { pattern: /^authors?$/, nextSegment: true },
      // /by/john-doe
      { pattern: /^by$/, nextSegment: true },
      // /contributors/john-doe
      { pattern: /^contributors?$/, nextSegment: true },
      // /writers/john-doe
      { pattern: /^writers?$/, nextSegment: true },
      // /team/john-doe
      { pattern: /^team$/, nextSegment: true },
      // /blog/john-doe/article-title (where john-doe is the author)
      { pattern: /^blog$/, checkSecondSegment: true },
      // /posts/author/john-doe
      { pattern: /^posts$/, checkForAuthor: true },
    ];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].toLowerCase();
      
      // Check for explicit author patterns
      for (const authorPattern of authorPatterns) {
        if (authorPattern.pattern.test(segment)) {
          if (authorPattern.nextSegment && i + 1 < segments.length) {
            return formatAuthorName(segments[i + 1]);
          }
          if (authorPattern.checkSecondSegment && i + 1 < segments.length) {
            // Check if the next segment looks like an author name (not a date or category)
            const potentialAuthor = segments[i + 1];
            if (!isDateSegment(potentialAuthor) && !isCategorySegment(potentialAuthor)) {
              return formatAuthorName(potentialAuthor);
            }
          }
          if (authorPattern.checkForAuthor && i + 2 < segments.length && segments[i + 1] === 'author') {
            return formatAuthorName(segments[i + 2]);
          }
        }
      }
    }
    
    // Check query parameters for author
    if (url.includes('?')) {
      const urlObj = new URL(url.startsWith('http') ? url : `https://example.com${url}`);
      const authorParam = urlObj.searchParams.get('author') || 
                         urlObj.searchParams.get('writer') ||
                         urlObj.searchParams.get('by');
      if (authorParam) {
        return formatAuthorName(authorParam);
      }
    }
    
    // If no author pattern found, return Unknown
    return 'Unknown Author';
  } catch (e) {
    console.error('Error extracting author from URL:', e);
    return 'Unknown Author';
  }
};

/**
 * Format author name from URL segment
 */
const formatAuthorName = (segment: string): string => {
  // Remove common suffixes
  let name = segment
    .replace(/\.(html?|php|aspx?)$/i, '')
    .replace(/[_-]/g, ' ')
    .trim();
  
  // Capitalize properly
  name = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Handle special cases
  if (name.length < 2 || name.match(/^\d+$/)) {
    return 'Unknown Author';
  }
  
  return name;
};

/**
 * Check if a URL segment looks like a date
 */
const isDateSegment = (segment: string): boolean => {
  // Check for year (4 digits), month (2 digits), or date patterns
  return /^\d{4}$/.test(segment) || 
         /^\d{2}$/.test(segment) || 
         /^\d{4}-\d{2}(-\d{2})?$/.test(segment);
};

/**
 * Check if a URL segment looks like a category
 */
const isCategorySegment = (segment: string): boolean => {
  const commonCategories = [
    'category', 'categories', 'tag', 'tags', 'topic', 'topics',
    'section', 'sections', 'news', 'blog', 'articles', 'posts',
    'tech', 'business', 'health', 'sports', 'entertainment',
    'politics', 'science', 'lifestyle', 'opinion', 'reviews'
  ];
  return commonCategories.includes(segment.toLowerCase());
};

/**
 * Parse date string in various formats
 */
export const parseDate = (dateStr: string): Date => {
  // Handle YYYYMMDD format from GA4
  if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }
  
  // Handle YYYY-MM-DD format
  return new Date(dateStr);
};

/**
 * Format a date range for display
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
};

/**
 * Calculate the number of days between two dates
 */
export const daysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
