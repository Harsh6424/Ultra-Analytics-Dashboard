import React from 'react';
import type { FilterState, Ga4Property } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (newFilters: Partial<FilterState>) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isPropertiesLoading: boolean;
  ga4Properties: Ga4Property[];
  gscSites: string[];
  propertiesError: string | null;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
    filters, 
    onFiltersChange, 
    onRefresh, 
    isLoading,
    isPropertiesLoading,
    ga4Properties,
    gscSites,
    propertiesError
 }) => {
  const handleInputChange = <K extends keyof FilterState,>(key: K, value: FilterState[K]) => {
    onFiltersChange({ [key]: value });
  };

  if (propertiesError) {
      return (
        <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm text-center mb-6">
            <p className="font-semibold">{propertiesError}</p>
        </div>
      );
  }

  return (
    <div className="p-4 bg-slate-800 rounded-lg mb-6 shadow-md">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        {/* GA4 and GSC Inputs */}
        <div>
          <label htmlFor="ga4Property" className="block text-sm font-medium text-slate-400 mb-1">GA4 Property</label>
          <select
            id="ga4Property"
            value={filters.ga4Property}
            onChange={e => handleInputChange('ga4Property', e.target.value)}
            disabled={isPropertiesLoading || ga4Properties.length === 0}
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 shadow-sm focus:border-brand-primary focus:ring focus:ring-brand-primary focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPropertiesLoading ? (
                <option>Loading properties...</option>
            ) : ga4Properties.length > 0 ? (
                <>
                <option value="">-- Select GA4 Property --</option>
                {ga4Properties.map(prop => (
                    <option key={prop.property} value={prop.property.replace('properties/','')}>
                        {prop.displayName} ({prop.property.replace('properties/','')})
                    </option>
                ))}
                </>
            ) : (
                <option>No GA4 properties found</option>
            )}
          </select>
        </div>
        <div>
          <label htmlFor="gscSite" className="block text-sm font-medium text-slate-400 mb-1">GSC Site</label>
          <select
            id="gscSite"
            value={filters.gscSite}
            onChange={e => handleInputChange('gscSite', e.target.value)}
            disabled={isPropertiesLoading || gscSites.length === 0}
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 shadow-sm focus:border-brand-primary focus:ring focus:ring-brand-primary focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPropertiesLoading ? (
                <option>Loading sites...</option>
            ) : gscSites.length > 0 ? (
                 <>
                    <option value="">-- Select GSC Site --</option>
                    {gscSites.map(site => (
                        <option key={site} value={site}>{site}</option>
                    ))}
                 </>
            ) : (
                <option>No GSC sites found</option>
            )}
          </select>
        </div>
        
        {/* Date Range Selector */}
        <div>
          <label htmlFor="dateRange" className="block text-sm font-medium text-slate-400 mb-1">Date Range</label>
          <select
            id="dateRange"
            value={filters.dateRange}
            onChange={e => handleInputChange('dateRange', e.target.value as FilterState['dateRange'])}
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 shadow-sm focus:border-brand-primary focus:ring focus:ring-brand-primary focus:ring-opacity-50"
          >
            <option value="last-28d">Last 28 days</option>
            <option value="last-30d">Last 30 days</option>
            <option value="last-3m">Last 3 months</option>
            <option value="last-6m">Last 6 months</option>
          </select>
        </div>

        {/* Top N Selector */}
        <div>
          <label htmlFor="topN" className="block text-sm font-medium text-slate-400 mb-1">Top N Rows</label>
          <select
            id="topN"
            value={filters.topN}
            onChange={e => handleInputChange('topN', parseInt(e.target.value, 10) as FilterState['topN'])}
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 shadow-sm focus:border-brand-primary focus:ring focus:ring-brand-primary focus:ring-opacity-50"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>

        {/* Toggles and Refresh Button */}
        <div className="flex flex-col sm:flex-row items-end gap-4 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center space-x-4">
                <div className="flex items-center">
                    <input
                        id="compare"
                        type="checkbox"
                        checked={filters.compare}
                        onChange={e => handleInputChange('compare', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary"
                    />
                    <label htmlFor="compare" className="ml-2 text-sm text-slate-300">Compare</label>
                </div>
                <div className="flex items-center">
                    <input
                        id="authorAnalysis"
                        type="checkbox"
                        checked={filters.authorAnalysis}
                        onChange={e => handleInputChange('authorAnalysis', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary"
                    />
                    <label htmlFor="authorAnalysis" className="ml-2 text-sm text-slate-300">Authors</label>
                </div>
            </div>
            <button
                onClick={onRefresh}
                disabled={isLoading || isPropertiesLoading}
                className="w-full sm:w-auto flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:bg-slate-500 transition-colors"
            >
                {isLoading ? 'Loading...' : 'Refresh'}
            </button>
        </div>
      </div>
    </div>
  );
};
