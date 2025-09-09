
import React from 'react';
import { formatNumber, formatPercentage, formatDecimal } from '../utils';
import type { GscDataRow, DiagnosticData, AuthorData } from '../types';

type DataItem = GscDataRow | DiagnosticData | AuthorData;

interface DataTableProps {
  title: string;
  headers: string[];
  data: DataItem[];
  isKeyValue?: boolean;
}

const renderCell = (item: DataItem, header: string, isKeyValue?: boolean) => {
    if (isKeyValue) {
        const row = item as DiagnosticData;
        if (header === 'Property') return <td className="py-3 px-4 text-sm text-slate-300 font-medium whitespace-nowrap">{row.property}</td>;
        if (header === 'Value') return <td className="py-3 px-4 text-sm text-slate-300 font-semibold">{row.value}</td>;
    }

    const row = item as GscDataRow | AuthorData;

    if ('key' in row) { // GscDataRow
        const gscRow = row as GscDataRow;
        switch(header) {
            case 'Query':
            case 'URL':
            case 'Country':
            case 'Device':
                return <td className="py-3 px-4 text-sm text-sky-400 font-medium whitespace-nowrap">{gscRow.key}</td>;
            case 'Clicks':
                return <td className="py-3 px-4 text-sm text-right">{formatNumber(gscRow.clicks)}</td>;
            case 'Impressions':
                return <td className="py-3 px-4 text-sm text-right">{formatNumber(gscRow.impressions)}</td>;
            case 'CTR':
                return <td className="py-3 px-4 text-sm text-right">{formatPercentage(gscRow.ctr)}</td>;
            case 'Avg. Position':
                 return <td className="py-3 px-4 text-sm text-right">{formatDecimal(gscRow.position)}</td>;
            default: return null;
        }
    }
    
    if ('author' in row) { // AuthorData
        const authorRow = row as AuthorData;
        switch(header) {
            case 'Author':
                return <td className="py-3 px-4 text-sm text-sky-400 font-medium whitespace-nowrap">{authorRow.author}</td>;
            case 'Articles':
                return <td className="py-3 px-4 text-sm text-right">{formatNumber(authorRow.articles)}</td>;
            case 'Total Pageviews':
                return <td className="py-3 px-4 text-sm text-right">{formatNumber(authorRow.totalPageviews)}</td>;
            case 'Avg Pageviews/Article':
                return <td className="py-3 px-4 text-sm text-right">{formatNumber(Math.round(authorRow.avgPageviews))}</td>;
             default: return null;
        }
    }

    return null;
}

export const DataTable: React.FC<DataTableProps> = ({ title, headers, data, isKeyValue = false }) => {
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
      <h3 className="text-lg font-semibold text-white p-4 border-b border-slate-700">{title}</h3>
      {data.length > 0 ? (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
                <tr>
                {headers.map(header => (
                    <th key={header} scope="col" className={`py-3.5 px-4 text-left text-sm font-semibold text-slate-400 ${header !== headers[0] && 'text-right'}`}>
                    {header}
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                {data.map((item, index) => (
                <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                    {headers.map(header => renderCell(item, header, isKeyValue))}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      ) : (
          <p className="p-4 text-sm text-slate-500">No data available for this period.</p>
      )}
    </div>
  );
};
