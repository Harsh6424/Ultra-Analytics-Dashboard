
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
        <div className="w-12 h-12 border-4 border-t-4 border-slate-600 border-t-brand-primary rounded-full animate-spin"></div>
        <p className="text-slate-400">Fetching Data & Generating Insights...</p>
    </div>
  );
};
