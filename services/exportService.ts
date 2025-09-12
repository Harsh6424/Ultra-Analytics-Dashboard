import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AppData, GscDataRow, DiagnosticData, AuthorData } from '../types';
import { formatNumber, formatPercentage, formatDecimal } from '../utils';

// FIX: Removed module augmentation for jspdf due to environment issues. Using type casting instead.

const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// --- PDF EXPORT ---
// FIX: Added hiddenInsights parameter to correctly pass insights for PDF generation.
export const exportToPdf = (data: AppData, hiddenInsights: string, siteUrl: string, dateRangeLabel: string) => {
    const doc = new jsPDF();
    const generatedOn = formatDate(new Date());
    const dateRangeText = `Date Range: ${dateRangeLabel.replace('last-', 'Last ').replace('d', ' Days').replace('m', ' Months')}`;

    // Cover Page
    doc.setFontSize(22);
    doc.text('SEO & Content Performance Report', 105, 60, { align: 'center' });
    doc.setFontSize(16);
    doc.text(siteUrl, 105, 75, { align: 'center' });
    doc.setFontSize(12);
    doc.text(dateRangeText, 105, 85, { align: 'center' });
    doc.text(`Generated on: ${generatedOn}`, 105, 95, { align: 'center' });

    const addFooter = () => {
        // FIX: Cast doc.internal to 'any' to access getNumberOfPages due to incomplete typings.
        const pageCount = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Page ${i} of ${pageCount} | GA4 & GSC Analytics Dashboard`, 105, 285, { align: 'center' });
        }
    };
    
    // --- SECTIONS ---
    // FIX: Removed the unused 'startY' parameter to resolve argument count errors in function calls.
    const addSection = (title: string, head: any[], body: any[][]) => {
        doc.addPage();
        doc.setFontSize(18);
        doc.text(title, 14, 20);
        // FIX: Cast doc to 'any' to use the 'autoTable' method from the jspdf-autotable plugin without TypeScript errors.
        (doc as any).autoTable({
            startY: 25,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [6, 78, 117] }, // Dark blue
        });
    };
    
    // Diagnostics
    addSection('Diagnostics', [['Property', 'Value']], data.diagnostics.map(d => [d.property, d.value]));
    
    // GSC Insights
    const gscHead = [['Query/URL/Country/Device', 'Clicks', 'Impressions', 'CTR', 'Avg. Position']];
    addSection('Top Keywords (Web)', gscHead, data.gsc.web.keywords.map(r => [r.key, formatNumber(r.clicks), formatNumber(r.impressions), formatPercentage(r.ctr), formatDecimal(r.position)]));
    addSection('Top URLs (Web)', gscHead, data.gsc.web.urls.map(r => [r.key, formatNumber(r.clicks), formatNumber(r.impressions), formatPercentage(r.ctr), formatDecimal(r.position)]));
    addSection('Top URLs (Discover)', gscHead, data.gsc.discover.urls.map(r => [r.key, formatNumber(r.clicks), formatNumber(r.impressions), formatPercentage(r.ctr), '—']));
    
    // Author Insights
    if(data.authors.length > 0) {
      const authorHead = [['Author', '# of Articles', 'Total Pageviews', 'Avg Pageviews/Article']];
      const authorBody = data.authors.map(a => [a.author, a.articles, formatNumber(a.totalPageviews), formatNumber(Math.round(a.avgPageviews))]);
      addSection('Author Insights', authorHead, authorBody);
    }

// Hidden Insights
doc.addPage();
doc.setFontSize(18);
doc.text('Hidden Insights', 14, 20);
const insights = doc.splitTextToSize(hiddenInsights.replace(/\*/g, ''), 180); // <-- Fixed
doc.setFontSize(12);
doc.text(insights, 14, 30);

    // Remove the first blank page created by addSection
    doc.deletePage(1);
    
    addFooter();
    doc.save(`${siteUrl.replace(/https?:\/\//, '')}_report.pdf`);
};


// --- EXCEL EXPORT ---
export const exportToExcel = (data: AppData, hiddenInsights: string) => {
    const wb = XLSX.utils.book_new();

    const formatGscData = (rows: GscDataRow[]) => rows.map(r => ({
        'Key': r.key,
        'Clicks': r.clicks,
        'Impressions': r.impressions,
        'CTR': r.ctr,
        'Position': r.position ?? 'N/A'
    }));

    // Sheet 1: Diagnostics
    const ws1 = XLSX.utils.json_to_sheet(data.diagnostics as DiagnosticData[]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Diagnostics');
    
    // GSC Sheets
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatGscData(data.gsc.web.keywords)), 'Top Keywords (Web)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatGscData(data.gsc.web.urls)), 'Top URLs (Web)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatGscData(data.gsc.discover.urls)), 'Top URLs (Discover)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatGscData(data.gsc.web.countries)), 'Top Countries (Web)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatGscData(data.gsc.discover.countries)), 'Top Countries (Discover)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatGscData(data.gsc.web.devices)), 'Top Devices (Web)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(formatGscData(data.gsc.discover.devices)), 'Top Devices (Discover)');
    
    // Author Insights
    if (data.authors.length > 0) {
        const authorSheetData = data.authors.map(a => ({
            'Author': a.author,
            'Number of Articles': a.articles,
            'Total Pageviews': a.totalPageviews,
            'Avg Pageviews/Article': a.avgPageviews,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(authorSheetData), 'Author Insights');
    }
    
    // Hidden Insights
    const insightsSheetData = hiddenInsights.split('\n').map(line => ({ Insight: line.replace(/(\*|-)\s*/, '') }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insightsSheetData), 'Hidden Insights');

    XLSX.writeFile(wb, 'seo_analytics_export.xlsx');
};
