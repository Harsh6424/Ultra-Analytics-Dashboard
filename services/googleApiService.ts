import type { AppData, FilterState, GscDataRow, AuthorData, TimeseriesData, Ga4Property, UserInfo } from '../types';
import { calculateGrowth, getGrowthType, shortFormatNumber, extractAuthorFromUrl, formatPercentage, formatDecimal, formatNumber } from '../utils';

// --- CACHE IMPLEMENTATION ---
interface CacheEntry {
  data: any;
  timestamp: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_DURATION) {
      console.log(`Cache hit for: ${key}`);
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const dataCache = new DataCache();

// --- RETRY LOGIC ---
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If successful, return
      if (response.ok) {
        return response;
      }
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : (i + 1) * 2000;
        console.log(`Rate limited. Waiting ${delay}ms before retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If unauthorized, don't retry
      if (response.status === 401 || response.status === 403) {
        return response;
      }
      
      // For other errors, try again
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${i + 1} failed:`, error);
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

// --- HELPER FUNCTIONS ---

/**
 * Parses a failed API response to extract the most descriptive error message.
 */
async function handleApiError(response: Response, apiName: string): Promise<never> {
    let detailedMessage = `Request failed with status ${response.status} (${response.statusText}).`;
    try {
        const errorBodyText = await response.text();
        if (!errorBodyText) {
             throw new Error(`${apiName} Error: ${detailedMessage}`);
        }

        try {
            const errorData = JSON.parse(errorBodyText);
            if (errorData.error) {
                if (typeof errorData.error === 'string') {
                    detailedMessage = errorData.error_description || errorData.error;
                } else if (errorData.error.message) {
                    detailedMessage = errorData.error.message;
                }
            } else if (errorData.message) {
                detailedMessage = errorData.message;
            } else {
                detailedMessage += ` Full response: ${errorBodyText}`;
            }
        } catch (jsonError) {
            detailedMessage += ` Raw response: ${errorBodyText}`;
        }
    } catch (e) {
        // Failed to read the response body
    }
    throw new Error(`${apiName} Error: ${detailedMessage}`);
}

/**
 * Converts a date range string into start and end dates.
 */
const getDateRange = (dateRange: FilterState['dateRange']): { 
  startDate: string, 
  endDate: string,
  previousStartDate: string,
  previousEndDate: string 
} => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday to ensure complete data
    const startDate = new Date(endDate);
    
    let daysDiff = 28;
    
    switch(dateRange) {
        case 'last-30d':
            daysDiff = 30;
            startDate.setDate(endDate.getDate() - 29);
            break;
        case 'last-3m':
            daysDiff = 90;
            startDate.setMonth(endDate.getMonth() - 3);
            break;
        case 'last-6m':
            daysDiff = 180;
            startDate.setMonth(endDate.getMonth() - 6);
            break;
        case 'last-28d':
        default:
            daysDiff = 28;
            startDate.setDate(endDate.getDate() - 27);
            break;
    }
    
    // Calculate previous period for comparison
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousEndDate.getDate() - (daysDiff - 1));
    
    // Format to YYYY-MM-DD
    const toApiDateString = (date: Date) => date.toISOString().split('T')[0];
    
    return { 
        startDate: toApiDateString(startDate), 
        endDate: toApiDateString(endDate),
        previousStartDate: toApiDateString(previousStartDate),
        previousEndDate: toApiDateString(previousEndDate)
    };
}

// --- API CALLS ---

/**
 * Fetches user profile information with graceful fallback.
 */
export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
    const cacheKey = `userInfo_${accessToken.substring(0, 10)}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    // Try multiple endpoints
    const endpoints = [
        'https://www.googleapis.com/oauth2/v3/userinfo',
        'https://www.googleapis.com/oauth2/v2/userinfo',
        'https://www.googleapis.com/oauth2/v1/userinfo'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            
            if (response.ok) {
                const data = await response.json();
                const userInfo = {
                    email: data.email || 'user@analytics.app',
                    name: data.name || data.given_name || 'Analytics User',
                    picture: data.picture || 'https://ui-avatars.com/api/?name=User&background=4285F4&color=fff'
                };
                dataCache.set(cacheKey, userInfo);
                return userInfo;
            } else {
                console.warn(`Userinfo endpoint ${endpoint} failed with status ${response.status}`);
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${endpoint}:`, error);
        }
    }
    
    // If all endpoints fail, return fallback
    console.warn('All userinfo endpoints failed, using fallback');
    const fallbackUserInfo = {
        email: 'user@analytics.app',
        name: 'Analytics User',
        picture: 'https://ui-avatars.com/api/?name=Analytics+User&background=4285F4&color=fff'
    };
    
    // Cache the fallback for a shorter duration (1 minute)
    dataCache.set(cacheKey, fallbackUserInfo);
    
    return fallbackUserInfo;
}

/**
 * Fetches a list of GA4 properties the user has access to.
 */
export async function fetchGa4Properties(accessToken: string): Promise<Ga4Property[]> {
    const cacheKey = `ga4Properties_${accessToken.substring(0, 10)}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    const GA4_ADMIN_API_ENDPOINT = `https://analyticsadmin.googleapis.com/v1beta/accountSummaries`;
    const response = await fetchWithRetry(GA4_ADMIN_API_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
        return handleApiError(response, 'GA4 Admin');
    }
    
    const result = await response.json();
    const properties: Ga4Property[] = [];
    
    if (result.accountSummaries) {
        for (const account of result.accountSummaries) {
            if (account.propertySummaries) {
                properties.push(...account.propertySummaries);
            }
        }
    }
    
    const sortedProperties = properties.sort((a, b) => a.displayName.localeCompare(b.displayName));
    dataCache.set(cacheKey, sortedProperties);
    return sortedProperties;
}

/**
 * Fetches a list of GSC sites the user has access to.
 */
export async function fetchGscSites(accessToken: string): Promise<string[]> {
    const cacheKey = `gscSites_${accessToken.substring(0, 10)}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    const GSC_API_ENDPOINT = `https://searchconsole.googleapis.com/v1/sites`;
    const response = await fetchWithRetry(GSC_API_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
        return handleApiError(response, 'GSC Sites');
    }
    
    const result = await response.json();
    const sites = result.siteEntry?.map((site: any) => site.siteUrl).sort() || [];
    dataCache.set(cacheKey, sites);
    return sites;
}

/**
 * Fetches data from Google Search Console API.
 */
async function fetchGscData(
    siteUrl: string, 
    accessToken: string,
    startDate: string,
    endDate: string,
    dimensions: ('query'|'page'|'country'|'device'|'date')[],
    searchType: 'web' | 'discover',
    rowLimit: number
): Promise<GscDataRow[]> {
    const cacheKey = `gsc_${siteUrl}_${startDate}_${endDate}_${dimensions.join('_')}_${searchType}_${rowLimit}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    const GSC_API_ENDPOINT = `https://searchconsole.googleapis.com/v1/searchanalytics/query`;
    
    const response = await fetchWithRetry(GSC_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            siteUrl,
            startDate,
            endDate,
            dimensions,
            searchType,
            rowLimit,
            aggregationType: 'auto',
        }),
    });

    if (!response.ok) {
        return handleApiError(response, `GSC (${dimensions.join(', ')})`);
    }

    const result = await response.json();

    if (!result.rows) {
        return [];
    }

    const data = result.rows.map((row: any): GscDataRow => ({
        key: dimensions.includes('date') ? row.keys[0] : row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
    }));
    
    dataCache.set(cacheKey, data);
    return data;
}

/**
 * Fetches time series data from GSC
 */
async function fetchGscTrends(
    siteUrl: string,
    accessToken: string,
    startDate: string,
    endDate: string,
    searchType: 'web' | 'discover' = 'web'
): Promise<TimeseriesData[]> {
    const cacheKey = `gscTrends_${siteUrl}_${startDate}_${endDate}_${searchType}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    const GSC_API_ENDPOINT = `https://searchconsole.googleapis.com/v1/searchanalytics/query`;
    
    const response = await fetchWithRetry(GSC_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            siteUrl,
            startDate,
            endDate,
            dimensions: ['date'],
            searchType,
            aggregationType: 'auto',
        }),
    });

    if (!response.ok) {
        return handleApiError(response, 'GSC Trends');
    }

    const result = await response.json();
    
    if (!result.rows) {
        return [];
    }

    const data = result.rows.map((row: any): TimeseriesData => ({
        date: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
    }));
    
    dataCache.set(cacheKey, data);
    return data;
}

/**
 * Fetches time series data from GA4
 */
async function fetchGa4Trends(
    propertyId: string,
    accessToken: string,
    startDate: string,
    endDate: string
): Promise<TimeseriesData[]> {
    const cacheKey = `ga4Trends_${propertyId}_${startDate}_${endDate}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    const GA4_API_ENDPOINT = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const response = await fetchWithRetry(GA4_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
    });

    if (!response.ok) {
        return handleApiError(response, 'GA4 Trends');
    }
    
    const result = await response.json();
    
    if (!result.rows) {
        return [];
    }

    const data = result.rows.map((row: any): TimeseriesData => ({
        date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        sessions: parseInt(row.metricValues[0].value, 10),
    }));
    
    dataCache.set(cacheKey, data);
    return data;
}

/**
 * Fetches aggregate totals from Google Analytics 4 Data API.
 */
async function fetchGa4Totals(
    propertyId: string, 
    accessToken: string,
    startDate: string,
    endDate: string
): Promise<{ sessions: number, pageviews: number }> {
    const cacheKey = `ga4Totals_${propertyId}_${startDate}_${endDate}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    const GA4_API_ENDPOINT = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const response = await fetchWithRetry(GA4_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
        }),
    });

    if (!response.ok) {
        return handleApiError(response, 'GA4 Totals');
    }
    
    const result = await response.json();
    const totalsRow = result.rows?.[0]?.metricValues;

    const sessions = parseInt(totalsRow?.[0]?.value || '0', 10);
    const pageviews = parseInt(totalsRow?.[1]?.value || '0', 10);

    const data = { sessions, pageviews };
    dataCache.set(cacheKey, data);
    return data;
}

/**
 * Fetches author data from GA4 by analyzing page paths
 */
async function fetchAuthorData(
    propertyId: string,
    accessToken: string,
    startDate: string,
    endDate: string,
    topN: number
): Promise<AuthorData[]> {
    if (!propertyId || !accessToken) return [];

    const cacheKey = `authorData_${propertyId}_${startDate}_${endDate}_${topN}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;

    const GA4_API_ENDPOINT = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const response = await fetchWithRetry(GA4_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'screenPageViews' }],
            limit: topN * 3, // Get more URLs to extract author patterns
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        }),
    });

    if (!response.ok) {
        console.error('Failed to fetch author data');
        return [];
    }
    
    const result = await response.json();
    
    if (!result.rows) {
        return [];
    }

    // Aggregate by author
    const authorMap = new Map<string, { articles: Set<string>, totalPageviews: number }>();
    
    result.rows.forEach((row: any) => {
        const pagePath = row.dimensionValues[0].value;
        const pageviews = parseInt(row.metricValues[0].value, 10);
        const author = extractAuthorFromUrl(pagePath);
        
        if (author !== 'Unknown Author') {
            const existing = authorMap.get(author) || { articles: new Set(), totalPageviews: 0 };
            existing.articles.add(pagePath);
            existing.totalPageviews += pageviews;
            authorMap.set(author, existing);
        }
    });

    // Convert to AuthorData array
    const authorData: AuthorData[] = Array.from(authorMap.entries())
        .map(([author, data]) => ({
            author,
            articles: data.articles.size,
            totalPageviews: data.totalPageviews,
            avgPageviews: data.totalPageviews / data.articles.size,
        }))
        .sort((a, b) => b.totalPageviews - a.totalPageviews)
        .slice(0, topN);

    dataCache.set(cacheKey, authorData);
    return authorData;
}

// --- MAIN DATA FETCHER ---
export const fetchAnalyticsData = async (filters: FilterState, accessToken: string): Promise<AppData> => {
    
    const { startDate, endDate, previousStartDate, previousEndDate } = getDateRange(filters.dateRange);

    // Execute all API calls in parallel for performance
    const [
        gscWebKeywords,
        gscWebUrls,
        gscWebCountries,
        gscWebDevices,
        gscDiscoverUrls,
        gscDiscoverCountries,
        gscDiscoverDevices,
        ga4CurrentTotals,
        ga4PreviousTotals,
        ga4Trends,
        gscTrends,
        authorData
    ] = await Promise.all([
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['query'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['page'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['country'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['device'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['page'], 'discover', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['country'], 'discover', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['device'], 'discover', filters.topN),
        fetchGa4Totals(`properties/${filters.ga4Property}`, accessToken, startDate, endDate),
        filters.compare ? fetchGa4Totals(`properties/${filters.ga4Property}`, accessToken, previousStartDate, previousEndDate) : Promise.resolve({ sessions: 0, pageviews: 0 }),
        fetchGa4Trends(`properties/${filters.ga4Property}`, accessToken, startDate, endDate),
        fetchGscTrends(filters.gscSite, accessToken, startDate, endDate),
        filters.authorAnalysis ? fetchAuthorData(`properties/${filters.ga4Property}`, accessToken, startDate, endDate, filters.topN) : Promise.resolve([])
    ]);

    // Calculate metrics
    const currentPeriodSessions = ga4CurrentTotals.sessions;
    const currentPeriodPageviews = ga4CurrentTotals.pageviews;
    const previousPeriodSessions = ga4PreviousTotals.sessions;
    const previousPeriodPageviews = ga4PreviousTotals.pageviews;
    
    const totalGscClicks = gscWebKeywords.reduce((sum, row) => sum + row.clicks, 0);
    const totalGscImpressions = gscWebKeywords.reduce((sum, row) => sum + row.impressions, 0);
    const avgPosition = gscWebKeywords.length > 0 
        ? gscWebKeywords.reduce((sum, row) => sum + (row.position || 0), 0) / gscWebKeywords.length 
        : 0;

    // Calculate growth
    const sessionsGrowth = filters.compare ? calculateGrowth(currentPeriodSessions, previousPeriodSessions) : undefined;
    const pageviewsGrowth = filters.compare ? calculateGrowth(currentPeriodPageviews, previousPeriodPageviews) : undefined;

    // Find highest performing day (from trends data)
    const highestSessionsDay = ga4Trends.reduce((max, day) => 
        (day.sessions || 0) > (max.sessions || 0) ? day : max, 
        { date: '', sessions: 0 }
    );

    const appData: AppData = {
        kpis: [
            { 
                label: 'Sessions', 
                value: shortFormatNumber(currentPeriodSessions),
                change: sessionsGrowth,
                changeType: sessionsGrowth ? getGrowthType(sessionsGrowth) : undefined
            },
            { 
                label: 'Pageviews', 
                value: shortFormatNumber(currentPeriodPageviews),
                change: pageviewsGrowth,
                changeType: pageviewsGrowth ? getGrowthType(pageviewsGrowth) : undefined
            },
            { 
                label: 'Pages/Session', 
                value: formatDecimal(currentPeriodSessions > 0 ? currentPeriodPageviews / currentPeriodSessions : 0) 
            },
            { 
                label: 'GSC Clicks', 
                value: shortFormatNumber(totalGscClicks) 
            },
            { 
                label: 'GSC Impressions', 
                value: shortFormatNumber(totalGscImpressions) 
            },
            { 
                label: 'GSC CTR', 
                value: formatPercentage(totalGscImpressions > 0 ? totalGscClicks / totalGscImpressions : 0) 
            },
            { 
                label: 'Avg Position', 
                value: formatDecimal(avgPosition) 
            },
        ],
        diagnostics: [
            { property: 'Analysis Period', value: `${startDate} to ${endDate}` },
            { property: 'GA4 Property', value: filters.ga4Property },
            { property: 'GSC Site', value: filters.gscSite },
            { property: 'Total Sessions', value: formatNumber(currentPeriodSessions) },
            { property: 'Total Pageviews', value: formatNumber(currentPeriodPageviews) },
            { property: 'Sessions Growth', value: sessionsGrowth || '—' },
            { property: 'Pageviews Growth', value: pageviewsGrowth || '—' },
            { property: 'Highest Sessions Day', value: highestSessionsDay.date ? `${highestSessionsDay.date} (${formatNumber(highestSessionsDay.sessions || 0)})` : '—' },
            { property: 'Pages per Session', value: formatDecimal(currentPeriodSessions > 0 ? currentPeriodPageviews / currentPeriodSessions : 0) },
            { property: 'GSC Total Clicks', value: formatNumber(totalGscClicks) },
            { property: 'GSC Total Impressions', value: formatNumber(totalGscImpressions) },
            { property: 'GSC Average CTR', value: formatPercentage(totalGscImpressions > 0 ? totalGscClicks / totalGscImpressions : 0) },
            { property: 'GSC Average Position', value: formatDecimal(avgPosition) },
            { property: 'Top Performing Device', value: gscWebDevices[0]?.key || '—' },
        ],
        gsc: {
          web: {
            keywords: gscWebKeywords,
            urls: gscWebUrls,
            countries: gscWebCountries,
            devices: gscWebDevices,
          },
          discover: {
            urls: gscDiscoverUrls,
            countries: gscDiscoverCountries,
            devices: gscDiscoverDevices,
          }
        },
        authors: authorData,
        trends: {
          ga4: ga4Trends,
          gsc: gscTrends,
        }
    };

    return appData;
};

// Export cache clear function for when user signs out
export const clearDataCache = () => {
    dataCache.clear();
};
