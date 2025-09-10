
import React, { useState } from 'react';

// Add this line to inform TypeScript about the global 'google' object from the GSI script
declare var google: any;

interface AuthProps {
  onAuthSuccess: (token: string) => void;
}

// IMPORTANT: Replace with your actual Google Cloud Client ID
const GOOGLE_CLIENT_ID = '569678483576-6c86kgrrpu1pav3mqj93u3n51cj9uilf.apps.googleusercontent.com';

type AuthError = {
    type: 'popup_blocker' | 'config' | 'token' | 'init' | 'popup_closed';
};

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const handleLogin = () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            onAuthSuccess(tokenResponse.access_token);
          } else {
            console.error('Failed to retrieve access token:', tokenResponse);
            setError({ type: 'token' });
            setIsAuthenticating(false);
          }
        },
        error_callback: (error: any) => {
            console.error("Google Auth Error:", error);
            if (error.type === 'popup_failed_to_open') {
                 setError({ type: 'popup_blocker' });
            } else if (error.type === 'popup_closed') {
                setError({ type: 'popup_closed' });
            } else { // Handles 'invalid_request', 'redirect_uri', etc.
                 setError({ type: 'config' });
            }
            setIsAuthenticating(false);
        }
      });
      client.requestAccessToken();
    } catch (e) {
        console.error("Error initializing Google Auth:", e);
        setError({ type: 'init' });
        setIsAuthenticating(false);
    }
  };
  
  const renderError = () => {
      if (!error) return null;

      switch (error.type) {
          case 'popup_blocker':
              return (
                  <div className="p-4 bg-yellow-900/50 text-yellow-300 border border-yellow-700 rounded-md text-sm text-left">
                      <p className="font-semibold mb-2">Popup Blocker Detected</p>
                      <p>Your browser has blocked the Google sign-in popup. Please disable your popup blocker for this site and try again.</p>
                  </div>
              );
          case 'popup_closed':
              return (
                  <div className="p-4 bg-yellow-900/50 text-yellow-300 border border-yellow-700 rounded-md text-sm text-left">
                      <p className="font-semibold mb-2">Authentication Canceled</p>
                      <p>The sign-in window was closed before authentication was complete. Please try again.</p>
                  </div>
              );
          case 'config':
              return (
                <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm text-left">
                    <p className="font-semibold mb-2 text-base">Authentication Failed</p>
                    <p className="font-bold mb-1">Common Cause: Mismatched URL (Origin)</p>
                    <p className="mb-2">Errors like `invalid_request`, `redirect_uri`, or a popup that closes instantly usually mean the app's URL is not whitelisted in your Google Cloud project.</p>
                    
                    <p className="font-semibold mt-3 mb-1">How to Fix:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
                        <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Credentials page</a> in Google Cloud.</li>
                        <li>Find the OAuth 2.0 Client ID you are using (it should be a "Web application" type).</li>
                        <li>Under "Authorized JavaScript origins", click "ADD URI".</li>
                        <li>Enter the exact URL from your browser's address bar.</li>
                    </ol>
                    <p className="mt-3 text-xs text-slate-400">This must be an *exact* match, including `http` vs `https` and any port number (e.g., `http://localhost:8080`).</p>
                </div>
              );
          case 'token':
              return (
                  <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm text-left">
                      <p className="font-semibold mb-2">Authentication Failed</p>
                      <p>The authentication process completed, but no access token was received. Please try again.</p>
                  </div>
              );
          case 'init':
          default:
              return (
                  <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm text-left">
                      <p className="font-semibold mb-2">Initialization Error</p>
                      <p>The Google authentication script failed to load. Please check your internet connection, ensure you don't have scripts blocked, and check the browser console for more details.</p>
                  </div>
              );
      }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-slate-800 rounded-lg shadow-lg text-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white">GA4 & GSC Analytics Dashboard</h2>
          <p className="mt-2 text-slate-400">
            Connect your Google accounts to unlock powerful SEO and content insights.
          </p>
        </div>
        
        {renderError()}

        <button
          onClick={handleLogin}
          disabled={isAuthenticating}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          {isAuthenticating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Authenticating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.99 12.035c0-1.02-.083-2.02-.246-3.003H12v5.69h5.606c-.245 1.838-1.487 3.4-3.417 4.46v3.63h4.48c2.61-2.4 4.14-6.08 4.14-10.787z" />
                <path d="M12 22c3.31 0 6.08-1.1 8.11-2.99l-4.48-3.63c-1.1.734-2.51.17-3.63.17-2.76 0-5.1-1.87-5.94-4.38H1.98v3.74C3.96 19.84 7.7 22 12 22z" />
                <path d="M6.06 13.62c-.2-.6-.31-1.23-.31-1.87s.11-1.27.31-1.87V6.02H1.98a10 10 0 000 11.96h4.08v-3.74z" />
                <path d="M12 4.02c1.93 0 3.66.69 4.99 1.95l3.54-3.54C18.08.49 15.22 0 12 0 7.7 0 3.96 2.16 1.98 5.28l4.08 3.74c.84-2.5 3.18-4.38 5.94-4.38z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};
