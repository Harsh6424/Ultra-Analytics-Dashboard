
import React from 'react';

interface InsightsSectionProps {
  title: string;
  insights: string;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ title, insights }) => {
    // Basic markdown to HTML conversion for bolding
    const formattedInsights = insights.split('\n').map(line => {
      // Handles **Bold Text:**
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-400">$1</strong>');
      // Handles - or * list items
      return line.replace(/(\*|-)\s/, '');
    });

    return (
        <div className="bg-slate-800 rounded-lg shadow-lg h-full">
            <h3 className="text-lg font-semibold text-white p-4 border-b border-slate-700">{title}</h3>
            <div className="p-4 space-y-3">
                {insights ? (
                <ul className="list-none space-y-3">
                    {formattedInsights.map((line, index) => (
                    <li key={index} className="flex items-start text-sm text-slate-300">
                        <svg className="w-4 h-4 mr-3 mt-0.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span dangerouslySetInnerHTML={{ __html: line }} />
                    </li>
                    ))}
                </ul>
                ) : (
                    <p className="text-sm text-slate-500">Generating insights...</p>
                )}
            </div>
        </div>
    );
};
