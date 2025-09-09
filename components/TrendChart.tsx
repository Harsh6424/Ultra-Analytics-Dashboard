
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TimeseriesData } from '../types';
import { shortFormatNumber } from '../utils';

interface TrendChartProps {
  title: string;
  data: TimeseriesData[];
  dataKey: keyof TimeseriesData;
  dataKey2?: keyof TimeseriesData;
  color: string;
  color2?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ title, data, dataKey, dataKey2, color, color2 }) => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg h-80">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(tick) => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(tick) => shortFormatNumber(tick as number)} />
          <Tooltip 
             contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderColor: '#334155',
                borderRadius: '0.5rem'
             }} 
             labelStyle={{ color: '#cbd5e1' }}
             formatter={(value: number, name: string) => [shortFormatNumber(value), name.charAt(0).toUpperCase() + name.slice(1)]}
          />
          <Legend wrapperStyle={{fontSize: "14px"}}/>
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} name={dataKey.toString()} />
          {dataKey2 && color2 && <Line type="monotone" dataKey={dataKey2} stroke={color2} strokeWidth={2} dot={false} name={dataKey2.toString()} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
