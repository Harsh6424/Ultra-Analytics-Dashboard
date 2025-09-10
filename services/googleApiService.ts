
import type { AppData, FilterState, GscDataRow, AuthorData, TimeseriesData, Ga4Property, UserInfo } from '../types';
import { calculateGrowth, getGrowthType, shortFormatNumber, extractAuthorFromUrl, formatPercentage, formatDecimal, formatNumber } from '../utils';

// --- HELPER FUNCTIONS ---

/**
 * Converts a date range string (e.g., 'last-28d') into start and end dates.
 */
const getDateRange = (dateRange: FilterState['dateRange']): { startDate: string, endDate: string } => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(dateRange) {
        case 'last-30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case 'last-3m':
            startDate.setMonth(endDate.getMonth() - 3);
            break;
        case 'last-6m':
            startDate.setMonth(endDate.getMonth() - 6);
            break;
        case 'last-28d':
        default:
            startDate.setDate(endDate.getDate() - 28);
            break;
    }
    
    // Format to YYYY-MM-DD
    const toApiDateString = (date: Date) => date.toISOString().split('T')[0];
    return { startDate: toApiDateString(startDate), endDate: toApiDateString(endDate) };
}


// --- API CALLS & DATA TRANSFORMATION ---

/**
 * Fetches user profile information.
 */
export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
    const USER_INFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';
    const response = await fetch(USER_INFO_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`User Info API Error: ${error.error.message || 'Failed to fetch user info.'}`);
    }
    return await response.json();
}


/**
 * Fetches a list of GA4 properties the user has access to.
 */
export async function fetchGa4Properties(accessToken: string): Promise<Ga4Property[]> {
    const GA4_ADMIN_API_ENDPOINT = `https://analyticsadmin.googleapis.com/v1beta/accountSummaries`;
    const response = await fetch(GA4_ADMIN_API_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GA4 Admin API Error: ${error.error?.message || 'Failed to list properties.'}`);
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
    return properties.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Fetches a list of GSC sites the user has access to.
 */
export async function fetchGscSites(accessToken: string): Promise<string[]> {
    const GSC_API_ENDPOINT = `https://www.googleapis.com/webmasters/v3/sites`;
    const response = await fetch(GSC_API_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GSC Sites API Error: ${error.error?.message || 'Failed to list sites.'}`);
    }
    const result = await response.json();
    return result.siteEntry?.map((site: any) => site.siteUrl).sort() || [];
}


/**
 * Fetches data from Google Search Console API.
 */
async function fetchGscData(
    siteUrl: string, 
    accessToken: string,
    startDate: string,
    endDate: string,
    dimensions: ('query'|'page'|'country'|'device')[],
    searchType: 'web' | 'discover',
    rowLimit: number
): Promise<GscDataRow[]> {
    const GSC_API_ENDPOINT = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    
    const response = await fetch(GSC_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            startDate,
            endDate,
            dimensions,
            searchType,
            rowLimit,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GSC API Error (${dimensions.join(', ')}): ${error.error?.message || 'Request failed.'}`);
    }

    const result = await response.json();

    if (!result.rows) {
        return [];
    }

    // Transform the raw API response into our AppData structure.
    return result.rows.map((row: any): GscDataRow => ({
        key: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
    }));
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
    const GA4_API_ENDPOINT = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const response = await fetch(GA4_API_ENDPOINT, {
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
        const error = await response.json();
        throw new Error(`GA4 API Error (Totals): ${error.error?.message || 'Request failed.'}`);
    }
    
    const result = await response.json();
    const totalsRow = result.totals?.[0]?.metricValues;

    const sessions = parseInt(totalsRow?.find((m: any) => m.metricName === 'sessions')?.value || '0', 10);
    const pageviews = parseInt(totalsRow?.find((m: any) => m.metricName === 'screenPageViews')?.value || '0', 10);

    return { sessions, pageviews };
}


// --- MAIN DATA FETCHER ---

export const fetchAnalyticsData = async (filters: FilterState, accessToken: string): Promise<AppData> => {
    
    const { startDate, endDate } = getDateRange(filters.dateRange);

    // --- Execute all API calls in parallel for performance ---
    const [
        gscWebKeywords,
        gscWebUrls,
        gscWebCountries,
        gscWebDevices,
        gscDiscoverUrls,
        ga4Totals
    ] = await Promise.all([
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['query'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['page'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['country'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['device'], 'web', filters.topN),
        fetchGscData(filters.gscSite, accessToken, startDate, endDate, ['page'], 'discover', filters.topN),
        fetchGa4Totals(`properties/${filters.ga4Property}`, accessToken, startDate, endDate),
    ]);

    // --- MOCK DATA FOR UNIMPLEMENTED PARTS (for demonstration) ---
    // NOTE: These require more complex API calls with 'date' or 'pagePath' dimensions.
    const generateMockTrend = () => Array.from({length: 28}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (27-i));
        return { date: d.toISOString().split('T')[0], sessions: 5000+i*50, clicks: 4000+i*40, impressions: 60000+i*300 };
    });
    const mockAuthors = filters.authorAnalysis ? [{author: 'Author A (mock)', articles: 5, totalPageviews: 12500, avgPageviews: 2500}] : [];
    
    const currentPeriodSessions = ga4Totals.sessions;
    const currentPeriodPageviews = ga4Totals.pageviews;
    const totalGscClicks = gscWebKeywords.reduce((sum, row) => sum + row.clicks, 0);
    const totalGscImpressions = gscWebKeywords.reduce((sum, row) => sum + row.impressions, 0);

    const appData: AppData = {
        kpis: [
            { label: 'Sessions', value: shortFormatNumber(currentPeriodSessions) },
            { label: 'Pageviews', value: shortFormatNumber(currentPeriodPageviews) },
            { label: 'Pageviews / Session', value: formatDecimal(currentPeriodSessions > 0 ? currentPeriodPageviews / currentPeriodSessions : 0) },
            { label: 'GSC Clicks', value: shortFormatNumber(totalGscClicks) },
            { label: 'GSC Impressions', value: shortFormatNumber(totalGscImpressions) },
            { label: 'GSC Avg. CTR', value: formatPercentage(totalGscImpressions > 0 ? totalGscClicks / totalGscImpressions : 0) },
            { label: 'GSC Avg. Position', value: '...' },
        ],
        diagnostics: [
            { property: 'Domain Age', value: 'N/A' },
            { property: 'Domain Authority', value: 'N/A' },
            { property: 'Monthly Sessions', value: formatNumber(currentPeriodSessions) },
            { property: 'Monthly Pageviews', value: formatNumber(currentPeriodPageviews) },
            { property: 'MoM Growth Sessions', value: '—' },
            { property: 'MoM Growth Pageviews', value: '—' },
            { property: 'Highest Sessions Month', value: `...` },
            { property: 'Highest Pageviews Month', value: `...` },
            { property: 'Pageviews / Session', value: formatDecimal(currentPeriodSessions > 0 ? currentPeriodPageviews / currentPeriodSessions : 0) },
            { property: '3 Month Growth Sessions', value: '—' },
            { property: 'GSC Clicks (Period)', value: formatNumber(totalGscClicks) },
            { property: 'GSC Impressions (Period)', value: formatNumber(totalGscImpressions) },
            { property: 'GSC Avg CTR (Period)', value: formatPercentage(totalGscImpressions > 0 ? totalGscClicks / totalGscImpressions : 0) },
            { property: 'GSC Avg Position (Period)', value: '...' },
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
            countries: [], // TODO: Add API call for discover countries
            devices: [],   // TODO: Add API call for discover devices
          }
        },
        authors: mockAuthors, // TODO: Replace with a GA4 API call (dimension: pagePath, metric: screenPageViews) and process URLs.
        trends: { // TODO: Replace with GA4/GSC API calls with a 'date' dimension.
          ga4: generateMockTrend().map(({date, sessions}) => ({date, sessions})),
          gsc: generateMockTrend().map(({date, clicks, impressions}) => ({date, clicks, impressions})),
        }
    };

    return appData;
};
