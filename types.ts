
export type DateRange = 'last-28d' | 'last-30d' | 'last-3m' | 'last-6m' | 'custom';
export type TopN = 10 | 25 | 50;
export type Device = 'Desktop' | 'Mobile' | 'Tablet';
export type GscSearchType = 'web' | 'discover';

export interface FilterState {
  dateRange: DateRange;
  compare: boolean;
  topN: TopN;
  authorAnalysis: boolean;
  ga4Property: string;
  gscSite: string;
}

export interface Kpi {
  label: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
}

export interface DiagnosticData {
  property: string;
  value: string | number;
}

export interface GscDataRow {
  key: string; // e.g., query, url, country, device
  clicks: number;
  impressions: number;
  ctr: number;
  position?: number;
}

export interface AuthorData {
  author: string;
  articles: number;
  totalPageviews: number;
  avgPageviews: number;
}

export interface TimeseriesData {
  date: string;
  sessions?: number;
  clicks?: number;
  impressions?: number;
}

export interface AppData {
  kpis: Kpi[];
  diagnostics: DiagnosticData[];
  gsc: {
    web: {
      keywords: GscDataRow[];
      urls: GscDataRow[];
      countries: GscDataRow[];
      devices: GscDataRow[];
    };
    discover: {
      urls: GscDataRow[];
      countries: GscDataRow[];
      devices: GscDataRow[];
    };
  };
  authors: AuthorData[];
  trends: {
    ga4: TimeseriesData[];
    gsc: TimeseriesData[];
  };
}
