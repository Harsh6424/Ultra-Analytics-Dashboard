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
        setError('<h3 class="text-xl font-semibold text-brand-danger">Missing Selection</h3><p class="mt-2 text-slate-400">Please select a GA4 Property and a GSC Site from the dropdowns.</p>');
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
      
      let errorMessage: string;
  
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          errorMessage = `
              <h3 class="text-xl font-semibold text-brand-danger">Request Failed</h3>
              <div class="max-w-2xl mx-auto mt-4 text-slate-300">
                <strong class="text-base text-white">This is a common one-time setup issue.</strong>
                <p class="mt-2">This error usually happens because the <strong class="text-amber-400">Google Analytics Data API</strong> is not enabled in your Google Cloud project. This is required to fetch report data.</p>
                <p class="mt-3 mb-3">Please click the link below to enable it. After enabling, you may need to refresh this page and sign in again.</p>
                <div class="text-center inline-block mt-1">
                    <a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noopener noreferrer" class="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg inline-block">Enable the Google Analytics Data API</a>
                </div>
              </div>
          `;
      } else {
          errorMessage = `
            <h3 class="text-xl font-semibold text-brand-danger">An Error Occurred</h3>
            <p class="mt-2 text-slate-400">${error.message || 'An unknown error occurred while fetching data.'}</p>
            <p class="mt-2 text-xs text-slate-500">Check the browser console for details. This could be due to incorrect GA4/GSC properties, missing API permissions, or an expired session.</p>
          `;
      }

      setError(errorMessage);
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
        const detailedError = `
            <strong class="text-base">Could not load your GA4/GSC properties.</strong>
            <p class="mt-2">This is usually because the necessary APIs are not enabled in your Google Cloud project.</p>
            <p class="mt-2 mb-2">Please click the links below to enable them for your project, then refresh this page:</p>
            <div class="text-left inline-block">
                <a href="https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold">1. Enable the Google Analytics Admin API</a>
                <br />
                <a href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold">2. Enable the Google Search Console API</a>
            </div>
            <p class="text-xs text-slate-400 mt-3">This is a one-time setup step for your Google Cloud project.</p>
        `;
        setPropertiesError(detailedError);
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
            <div className="text-center py-16 bg-slate-800 rounded-lg" dangerouslySetInnerHTML={{ __html: error }} />
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