import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './context/AuthProvider';
import { SettingsProvider } from './context/SettingsProvider';
import { SystemProvider } from './context/SystemProvider';
import { DataProvider } from './context/DataProvider';
import { ToolProvider } from './context/ToolProvider';
import { TimerProvider } from './contexts/TimerContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
(globalThis as any).localStorage = localStorageMock as any;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

test('renders Genatis Board application', () => {
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <SystemProvider>
            <DataProvider>
              <ToolProvider>
                <TimerProvider>
                  <App />
                </TimerProvider>
              </ToolProvider>
            </DataProvider>
          </SystemProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
  expect(screen.getByText(/Genatis Board/i)).toBeInTheDocument();
});

