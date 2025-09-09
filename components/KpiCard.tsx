
import React from 'react';
import type { Kpi } from '../types';

const ChangeIndicator: React.FC<{ changeType?: 'increase' | 'decrease' | 'neutral' }> = ({ changeType }) => {
  if (changeType === 'increase') {
    return <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
  }
  if (changeType === 'decrease') {
    return <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
  }
  return null;
};

export const KpiCard: React.FC<Kpi> = ({ label, value, change, changeType }) => {
  const changeColorClass = changeType === 'increase' ? 'text-green-400' : changeType === 'decrease' ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-md">
      <p className="text-sm text-slate-400 truncate">{label}</p>
      <div className="flex items-baseline space-x-2 mt-1">
        <p className="text-2xl font-semibold text-white">{value}</p>
        {change && (
          <div className={`flex items-center text-sm font-medium ${changeColorClass}`}>
            <ChangeIndicator changeType={changeType} />
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
};
