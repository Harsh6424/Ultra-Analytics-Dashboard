import React from 'react';
import type { UserInfo } from '../types';

interface HeaderProps {
    userInfo: UserInfo | null;
    onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userInfo, onSignOut }) => {
  return (
    <header className="bg-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-white">GA4 & GSC SEO Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
            {userInfo && (
                <div className="flex items-center gap-3 text-right">
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-white">{userInfo.name}</p>
                        <p className="text-xs text-slate-400">{userInfo.email}</p>
                    </div>
                    <img src={userInfo.picture} alt="User profile" className="w-10 h-10 rounded-full" />
                </div>
            )}
            <button
              onClick={onSignOut}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary transition-colors"
            >
              Sign Out
            </button>
        </div>
      </div>
    </header>
  );
};