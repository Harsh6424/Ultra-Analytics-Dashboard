import { clearDataCache } from './services/googleApiService';
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { Dashboard } from './components/Dashboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Auth } from './components/Auth';
import { fetchAnalyticsData, fetchGa4Properties, fetchGscSites, fetchUserInfo } from './services/googleApiService';
import { generateHiddenInsights } from './services/geminiService';
import type { AppData, FilterState, Ga4Property, UserInfo } from './types';

const App: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
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
    } catch (error: any)
    {
      console.error("Error fetching data or insights:", error);
      
      let errorMessage: string;
  
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          errorMessage = `
              <h3 class="text-xl font-semibold text-brand-danger">Request Failed: Let's Troubleshoot</h3>
              <div class="max-w-3xl mx-auto mt-4 text-slate-300 text-left">
                <p class="mb-4 text-center">This error is almost always a configuration or permissions issue. Please carefully check these common causes:</p>

                <div class="mt-4 p-4 border border-slate-600 rounded-lg">
                  <strong class="text-base text-white">1. Verify Correct Google Account</strong>
                  <p class="mt-1 text-sm text-slate-400">
                    Look at the top-right of the header. Is the email address shown there the one that has <strong class="text-amber-400">"Viewer"</strong> access to your GA4 Property? If not, please sign out and sign back in with the correct account.
                  </p>
                </div>

                <div class="mt-4 p-4 border border-slate-600 rounded-lg">
                  <strong class="text-base text-white">2. Check Google Cloud Project Configuration</strong>
                  <p class="mt-1 text-sm text-slate-400">
                    The OAuth Client ID you are using <strong class="text-amber-400">MUST</strong> belong to the same Google Cloud project where you enabled the "Google Analytics Data API". This is the most common point of failure.
                  </p>
                   <div class="text-left inline-block mt-2">
                     <a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold text-sm">Check/Enable the Data API Here</a>
                   </div>
                </div>

                <div class="mt-4 p-4 border border-slate-600 rounded-lg">
                  <strong class="text-base text-white">3. Ensure Billing is Enabled</strong>
                  <p class="mt-1 text-sm text-slate-400">
                    Even if you are within the free tier, Google requires <strong class="text-amber-400">Billing</strong> to be enabled on your Cloud project to use many APIs.
                  </p>
                </div>
                
                <p class="text-xs text-slate-500 mt-4 text-center">After making any changes, please use the "Sign Out" button and sign back in to refresh your permissions. A hard refresh (Ctrl+Shift+R or Cmd+Shift+R) can also help.</p>
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
    
    // Optional debug logging - uncomment if you need to debug
    // console.log('Token received:', token.substring(0, 20) + '...');
    
    try {
        // Optional debug logging for each API call
        // console.log('Fetching GA4 properties...');
        const ga4Props = await fetchGa4Properties(token);
        // console.log('GA4 Properties:', ga4Props);
        
        // console.log('Fetching GSC sites...');
        const gscProps = await fetchGscSites(token);
        // console.log('GSC Sites:', gscProps);
        
        // console.log('Fetching user info...');
        const userInfo = await fetchUserInfo(token);
        // console.log('User Info:', userInfo);
        
        setUserInfo(userInfo);
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
        // Optional detailed error logging
        // console.error("Error response:", err.response);
        
        const detailedError = `
            <strong class="text-base text-brand-danger">Authentication Error: Could not load user or property data.</strong>
            <p class="mt-2">I know this is incredibly frustrating. This error almost always means a specific API is not enabled in your Google Cloud project, even if other parts of the app seem to work. Please follow these steps exactly:</p>

            <div class="mt-4 p-4 border border-slate-600 rounded-lg text-left">
                <strong class="text-base text-white">Step 1: Find Your Correct Google Cloud Project ID</strong>
                <p class="mt-1 mb-2 text-sm text-slate-400">The OAuth Client ID you're using is tied to ONE specific project. All APIs must be enabled there.</p>
                <ol class="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to your <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline">Credentials page</a>.</li>
                    <li>Find the "OAuth 2.0 Client ID" you are using for this app.</li>
                    <li>Look at the top of the Google Cloud console. Does the Project Name and ID shown there match the project you expect? If you're not sure, click the project name at the top to see a list of all your projects. Make sure you select the right one before proceeding. <strong class="text-amber-400">This is the most common point of failure.</strong></li>
                </ol>
            </div>

            <div class="mt-4 p-4 border border-slate-600 rounded-lg text-left">
                <strong class="text-base text-white">Step 2: Verify APIs are Enabled (In the Correct Project)</strong>
                <p class="mt-1 mb-2 text-sm text-slate-400">Once you are certain you are in the correct project, click these links to enable the required APIs. It is critical that <strong class="text-amber-400">ALL FOUR</strong> of these are enabled. If they are already enabled, the link will show you their status.</p>
                <a href="https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold text-sm">1. Enable Google Analytics Admin API (for listing properties)</a>
                <br />
                <a href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold text-sm">2. Enable Google Search Console API (for listing sites)</a>
                <br />
                <a href="https://console.cloud.google.com/apis/library/people.googleapis.com" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold text-sm">3. Enable Google People API (for user info)</a>
                <br />
                <a href="https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold text-sm">4. Enable Google Analytics Data API (for fetching reports)</a>
            </div>

            <div class="mt-4 p-4 border border-slate-600 rounded-lg text-left">
                <strong class="text-base text-white">Step 3: The "Reset Button" - Force a New Permission Grant</strong>
                <p class="mt-1 mb-2 text-sm text-slate-400">
                    Sometimes your browser holds on to an old, incorrect permission grant. Revoking the app's access forces it to ask for the correct permissions again from scratch.
                </p>
                <ol class="list-decimal list-inside space-y-1 text-sm">
                  <li>Click this link to go to your Google Account permissions page: <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-semibold">Google Account Permissions</a></li>
                  <li>Find this application in the list (it may be called "GA4 & GSC SEO Analytics Dashboard" or the name you gave it).</li>
                  <li>Click on it, and then click <strong class="text-amber-400">"Remove Access"</strong>.</li>
                </ol>
            </div>
            
            <p class="text-sm font-semibold text-slate-300 mt-4">After completing all steps, please "Sign Out" from the top-right of this app, and then sign back in. This will trigger a fresh authentication flow.</p>
        `;
        setPropertiesError(detailedError);
    } finally {
        setIsPropertiesLoading(false);
    }
  }, []);

  const handleSignOut = () => {
    setAccessToken(null);
    setUserInfo(null);
    setData(null);
    setError(null);
    setPropertiesError(null);
    setGa4Properties([]);
    setGscSites([]);
    setHiddenInsights('');
    setFilters({
      dateRange: 'last-28d',
      compare: true,
      topN: 10,
      authorAnalysis: true,
      ga4Property: '',
      gscSite: '',
    });
    clearDataCache();
    sessionStorage.removeItem('token_expiry');
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
      <Header userInfo={userInfo} onSignOut={handleSignOut} />
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
