import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MantineProvider } from '@mantine/core';
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
  usePageTracking();

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

  // Sync Tailwind dark class
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', colorScheme === 'dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ColorSchemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
        <MantineProvider
          forceColorScheme={colorScheme}
          theme={{
            fontFamily: 'Inter, system-ui, sans-serif',
            headings: {
              fontFamily: 'Space Grotesk, ui-sans-serif, system-ui, sans-serif',
              fontWeight: '600',
            },
            colors: {
              brand: [
                '#e6f9f2',
                '#c1f0df',
                '#99e6cc',
                '#66d9b8',
                '#33cca3',
                '#00A86B',
                '#008d5a',
                '#00734b',
                '#005c3b',
                '#00452c',
              ],
              gold: [
                '#fffbe6',
                '#fff5c2',
                '#ffef99',
                '#ffe966',
                '#ffe333',
                '#FFC300',
                '#d9a000',
                '#b38000',
                '#8c6000',
                '#664500',
              ],
            },
            primaryColor: 'brand',
            defaultRadius: 'md',
            components: {
              MultiSelect: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                styles: (theme: any) => ({
                  dropdown: {
                    backgroundColor:
                      theme.colorScheme === 'dark'
                        ? theme.colors.dark[7]
                        : theme.white,
                  },
                  option: {
                    color:
                      theme.colorScheme === 'dark' ? theme.white : theme.black,
                  },
                }),
              },
              Select: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                styles: (theme: any) => ({
                  dropdown: {
                    backgroundColor:
                      theme.colorScheme === 'dark'
                        ? theme.colors.dark[7]
                        : theme.white,
                  },
                  option: {
                    color:
                      theme.colorScheme === 'dark' ? theme.white : theme.black,
                  },
                }),
              },
            },
          }}
        >
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
          <ReactQueryDevtools initialIsOpen={false} />
        </MantineProvider>
      </ColorSchemeContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
