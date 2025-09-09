import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { Dashboard } from './components/Dashboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Auth } from './components/Auth';
import { fetchAnalyticsData, fetchGa4Properties, fetchGscSites } from './services/googleApiService';
import { generateHiddenInsights } from './services/geminiService';
import type { AppData, FilterState, Ga4Property } from './types';

const App: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPropertiesLoading, setIsPropertiesLoading] = useState<boolean>(false);
  const [data, setData] = useState<AppData | null>(null);
  const [hiddenInsights, setHiddenInsights] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  const [ga4Properties, setGa4Properties] = useState<Ga4Property[]>([]);
  const [gscSites, setGscSites] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'last-28d',
    compare: true,
    topN: 10,
    authorAnalysis: true,
    ga4Property: '',
    gscSite: '',
  });

  const fetchDataAndInsights = useCallback(async (token: string) => {
    setIsLoading(true);
    setHiddenInsights('');
    setError(null);
    setData(null);

    if (!filters.ga4Property || !filters.gscSite) {
        setError('Please select a GA4 Property and a GSC Site from the dropdowns.');
        setIsLoading(false);
        return;
    }

    try {
      const fetchedData = await fetchAnalyticsData(filters, token);
      setData(fetchedData);
      
      const insights = await generateHiddenInsights(fetchedData);
      setHiddenInsights(insights);
    } catch (error: any) {
      console.error("Error fetching data or insights:", error);
      setError(error.message || 'An unknown error occurred while fetching data.');
      setData(null);
      setHiddenInsights('Failed to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleAuthSuccess = useCallback(async (token: string) => {
    setAccessToken(token);
    setIsPropertiesLoading(true);
    setPropertiesError(null);
    try {
        const [ga4Props, gscProps] = await Promise.all([
            fetchGa4Properties(token),
            fetchGscSites(token)
        ]);
        setGa4Properties(ga4Props);
        setGscSites(gscProps);
        
        // Pre-select the first available property if available
        if (gscProps.length > 0) {
           setFilters(prev => ({...prev, gscSite: gscProps[0]}));
        }
        if (ga4Props.length > 0) {
           setFilters(prev => ({...prev, ga4Property: ga4Props[0].property.replace('properties/','')}));
        }

    } catch(err: any) {
        console.error("Failed to load user properties:", err);
        setPropertiesError("Could not load your GA4/GSC properties. Please ensure you've granted permissions and refresh the page.");
    } finally {
        setIsPropertiesLoading(false);
    }
  }, []);
  
  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };
  
  const handleRefresh = () => {
     if (accessToken) {
        fetchDataAndInsights(accessToken);
     }
  };

  if (!accessToken) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }
  
  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <FilterBar 
            filters={filters} 
            onFiltersChange={handleFiltersChange} 
            onRefresh={handleRefresh} 
            isLoading={isLoading}
            isPropertiesLoading={isPropertiesLoading}
            ga4Properties={ga4Properties}
            gscSites={gscSites}
            propertiesError={propertiesError}
        />
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <LoadingSpinner />
          </div>
        ) : error ? (
            <div className="text-center py-16 bg-slate-800 rounded-lg">
                <h3 className="text-xl font-semibold text-brand-danger">Request Failed</h3>
                <p className="mt-2 text-slate-400">{error}</p>
                <p className="mt-2 text-xs text-slate-500">Check the browser console for details. This could be due to incorrect GA4/GSC properties, missing API permissions, or an expired session.</p>
            </div>
        ) : data ? (
          <Dashboard data={data} hiddenInsights={hiddenInsights} siteUrl={filters.gscSite} dateRangeLabel={filters.dateRange}/>
        ) : !propertiesError ? ( // Only show this if there isn't a more important property loading error
          <div className="text-center py-16 text-slate-500">
            <p>Please select your GA4 and GSC properties and click Refresh to load data.</p>
          </div>
        ) : null }
      </main>
    </div>
  );
};

export default App;
