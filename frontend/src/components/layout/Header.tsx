import { useAppStore } from '../../store/appStore';
import Logo from '../ui/Logo';
import { IconSun, IconMoon, IconMenu2 } from '@tabler/icons-react';
import { useColorScheme } from '../../contexts/ColorSchemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

const Header = () => {
  const { currentView, setCurrentView, toggleMobileMenu } = useAppStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isMobile, responsive } = useResponsive();

  const navItems = [
    { id: 'overview', path: '/overview', label: 'Overview', icon: '📊' },
    { id: 'players', path: '/players', label: 'Players', icon: '👤' },
    { id: 'analytics', path: '/analytics', label: 'Analytics', icon: '📈' },
    { id: 'combinations', path: '/combinations', label: 'Combinations', icon: '🔗' },
    { id: 'tools', path: '/tools', label: 'Tools', icon: '🧰' },
    { id: 'about', path: '/about', label: 'About', icon: 'ℹ️' },
  ] as const;

  const { colorScheme, toggleColorScheme } = useColorScheme();

  const prefetchForPath = (path: string) => {
    // Always prefetch metadata since many views use it
    queryClient.prefetchQuery({ queryKey: ['metadata'], queryFn: () => apiService.getMetadata() });
    if (path === '/overview') {
      queryClient.prefetchQuery({ queryKey: ['positionStats'], queryFn: () => apiService.getPositionStats() });
      queryClient.prefetchQuery({ queryKey: ['roundCounts', 'QB', 'mean'], queryFn: () => apiService.getPositionDraftCountsByRound('QB', 'mean') });
    } else if (path === '/players') {
      queryClient.prefetchQuery({ queryKey: ['players', 1, [], []], queryFn: () => apiService.getPlayers({ limit: 20, offset: 0 }) });
    } else if (path === '/analytics') {
      queryClient.prefetchQuery({ queryKey: ['draft-slot', 1, 'percent', 25], queryFn: () => apiService.getDraftSlotCorrelation(1, 'percent', 25) });
      queryClient.prefetchQuery({ queryKey: ['week17-bringback', 'team', 'BUF', 15], queryFn: () => apiService.getWeek17Bringback('team', 'BUF', 15) });
    } else if (path === '/combinations') {
      queryClient.prefetchQuery({ queryKey: ['metadata'], queryFn: () => apiService.getMetadata() });
    }
  };

  return (
    <header className="bg-white dark:bg-surface-dark text-gridiron-graphite dark:text-white border-b border-gray-200 dark:border-white/10 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile hamburger menu */}
            {isMobile && (
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gridiron-graphite/20 transition"
                aria-label="Toggle menu"
              >
                <IconMenu2 size={20} />
              </button>
            )}
            <div className="flex items-center space-x-2">
              <a
                href="https://thesignalcallers.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Logo size={responsive.logoSize} />
              </a>
              <h1
                className={`font-heading font-semibold dark:text-white ${responsive.title}`}
              >
                TheSignalCallers
              </h1>
            </div>
          </div>

          <nav className={`flex items-center ${responsive.navSpacing}`} aria-label="Main navigation">
            {navItems.map(item => {
              const active = location.pathname === item.path || currentView === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setCurrentView(item.id)}
                  onMouseEnter={() => prefetchForPath(item.path)}
                  className={`
                    ${responsive.navPadding} rounded-lg font-medium transition-colors duration-200
                    flex items-center space-x-2 min-h-[44px]
                    ${
                      active
                        ? 'bg-signal-green/10 text-signal-green border border-signal-green/30'
                        : 'text-gridiron-graphite dark:text-white hover:text-signal-green hover:bg-gray-50 dark:hover:bg-gridiron-graphite-light'
                    }
                  `}
                  aria-current={active ? 'page' : undefined}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => toggleColorScheme()}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gridiron-graphite/20 transition"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? (
                <IconSun size={18} />
              ) : (
                <IconMoon size={18} />
              )}
            </button>
            <button
              onClick={async () => {
                if (import.meta.env.PROD) {
                  await import('../../ga-init');
                } else {
                  // In dev/test, this will no-op since GA is disabled
                  console.log('[GA] Manual init');
                }
              }}
              className="ml-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gridiron-graphite/20 transition"
              aria-label="Initialize analytics"
              title="Initialize analytics"
            >
              <span className="text-xs">GA</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
