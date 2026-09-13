import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './tailwind.css';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { TimerProvider } from './contexts/TimerContext';
import { AuthProvider } from './context/AuthProvider';
import { SystemProvider } from './context/SystemProvider';
import { SettingsProvider } from './context/SettingsProvider';
import { DataProvider } from './context/DataProvider';
import { ToolProvider } from './context/ToolProvider';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

if ((import.meta.env.VITE_SENTRY_DSN as any) && (import.meta.env.VITE_SENTRY_DSN as any).startsWith('http')) {
  try {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN as any,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch (err) {
// /* console.error */ ('[SENTRY] Failed to initialize renderer process Sentry:', err);
  }
}

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <SystemProvider>
              <DataProvider>
                <ToolProvider>
                  <TimerProvider>
                    <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff', borderRadius: '8px' } }} />
                    <App />
                  </TimerProvider>
                </ToolProvider>
              </DataProvider>
            </SystemProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
