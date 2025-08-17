import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, lazy, Suspense } from 'react';
import { MantineProvider } from '@mantine/core';
import { brandTheme } from './theme/brand';
import { BrowserRouter } from 'react-router-dom';
import { ColorSchemeContext } from './contexts/ColorSchemeContext';
import { useLocalStorage } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MainContent from './components/layout/MainContent';
import { useAppStore } from './store/appStore';
import { useResponsive } from './hooks/useResponsive';
import { usePageTracking } from './hooks/useGoogleAnalytics';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { currentView, isMobileMenuOpen } = useAppStore();
  const { isMobile } = useResponsive();

  // Initialize Google Analytics page tracking
  usePageTracking(currentView);

  // Detect preferred color scheme on first load
  const getPreferredScheme = () => {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    // Fallback for SSR/non-browser environments
    return 'light';
  };

  const [colorScheme, setColorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'sc-color-scheme',
    defaultValue: getPreferredScheme(),
  });

  const toggleColorScheme = (value?: 'light' | 'dark') =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  // Sync Tailwind dark class when color scheme changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', colorScheme === 'dark');
    }
  }, [colorScheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ColorSchemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
          <MantineProvider forceColorScheme={colorScheme} theme={brandTheme}>
            <Notifications position="top-right" />
            <div className="min-h-screen bg-gray-50 dark:bg-gridiron-graphite-light flex flex-col">
              <Header />
              <div className="flex flex-1 min-h-0 relative">
                {/* Mobile overlay when menu is open */}
                {isMobile && isMobileMenuOpen && (
                  <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => useAppStore.getState().toggleMobileMenu()}
                  />
                )}
                <Sidebar />
                <MainContent view={currentView} />
              </div>
            </div>
            {import.meta.env.DEV && (
              <Suspense fallback={null}>
                <LazyReactQueryDevtools initialIsOpen={false} />
              </Suspense>
            )}
          </MantineProvider>
        </ColorSchemeContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

// Lazy-load React Query Devtools only in development to avoid bundling in production
const LazyReactQueryDevtools = lazy(async () => {
  const mod = await import('@tanstack/react-query-devtools');
  return { default: mod.ReactQueryDevtools };
});
