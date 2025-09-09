
import React from 'react';
import type { AppData } from '../types';
import { KpiCard } from './KpiCard';
import { TrendChart } from './TrendChart';
import { DataTable } from './DataTable';
import { InsightsSection } from './InsightsSection';
import { exportToPdf, exportToExcel } from '../services/exportService';

interface DashboardProps {
  data: AppData;
  hiddenInsights: string;
  siteUrl: string;
  dateRangeLabel: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, hiddenInsights, siteUrl, dateRangeLabel }) => {
    
    // FIX: Pass hiddenInsights to the exportToPdf function.
    const handleExportPdf = () => exportToPdf(data, hiddenInsights, siteUrl, dateRangeLabel);
    const handleExportExcel = () => exportToExcel(data, hiddenInsights);

    return (
    <div className="space-y-6">
        {/* Header and KPIs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">Performance Dashboard</h1>
            <div className="flex gap-2">
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-green-700 transition-colors">
                    <DownloadIcon /> Export Excel
                </button>
                <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-danger rounded-md hover:bg-red-700 transition-colors">
                    <DownloadIcon /> Export PDF
                </button>
            </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {data.kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart title="GA4 Sessions Trend" data={data.trends.ga4} dataKey="sessions" color="#4285F4" />
            <TrendChart title="GSC Clicks & Impressions" data={data.trends.gsc} dataKey="clicks" dataKey2="impressions" color="#34A853" color2="#FBBC05" />
        </div>

        {/* Insights Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataTable title="Diagnostics" headers={['Property', 'Value']} data={data.diagnostics} isKeyValue />
            <InsightsSection title="Hidden & Rare Insights" insights={hiddenInsights} />
        </div>
        
        <DataTable title="Top Keywords (Web)" headers={['Query', 'Clicks', 'Impressions', 'CTR', 'Avg. Position']} data={data.gsc.web.keywords} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataTable title="Top URLs (Web)" headers={['URL', 'Clicks', 'Impressions', 'CTR', 'Avg. Position']} data={data.gsc.web.urls} />
            <DataTable title="Top URLs (Discover)" headers={['URL', 'Clicks', 'Impressions', 'CTR', 'Avg. Position']} data={data.gsc.discover.urls} />
        </div>
        
        {data.authors.length > 0 &&
            <DataTable title="Author Insights" headers={['Author', 'Articles', 'Total Pageviews', 'Avg Pageviews/Article']} data={data.authors} />
        }

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DataTable title="Top Countries (Web)" headers={['Country', 'Clicks', 'Impressions', 'CTR']} data={data.gsc.web.countries} />
            <DataTable title="Top Devices (Web)" headers={['Device', 'Clicks', 'Impressions', 'CTR']} data={data.gsc.web.devices} />
            <DataTable title="Top Countries (Discover)" headers={['Country', 'Clicks', 'Impressions', 'CTR']} data={data.gsc.discover.countries} />
            <DataTable title="Top Devices (Discover)" headers={['Device', 'Clicks', 'Impressions', 'CTR']} data={data.gsc.discover.devices} />
        </div>
    </div>
  );
};

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);