import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { Dashboard } from './components/Dashboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Auth } from './components/Auth';
import { fetchAnalyticsData } from './services/googleApiService';
import { generateHiddenInsights } from './services/geminiService';
import type { AppData, FilterState } from './types';

const App: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<AppData | null>(null);
  const [hiddenInsights, setHiddenInsights] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'last-28d',
    compare: true,
    topN: 10,
    authorAnalysis: true,
    ga4Property: '', // User must fill this in
    gscSite: '', // User must fill this in
  });

  const fetchDataAndInsights = useCallback(async (token: string) => {
    setIsLoading(true);
    setHiddenInsights('');
    setError(null);
    setData(null);

    if (!filters.ga4Property || !filters.gscSite) {
        setError('Please enter a valid GA4 Property ID and GSC Site URL.');
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

  const handleAuthSuccess = (token: string) => {
    setAccessToken(token);
    // Data is not fetched immediately, but on refresh, allowing user to input properties first.
  };
  
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
        <FilterBar filters={filters} onFiltersChange={handleFiltersChange} onRefresh={handleRefresh} isLoading={isLoading}/>
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
        ) : (
          <div className="text-center py-16 text-slate-500">
            <p>Please configure your GA4 and GSC properties and click Refresh to load data.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;