import { useAppStore } from '../../store/appStore';
import Logo from '../ui/Logo';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

const Header = () => {
  const { currentView, setCurrentView } = useAppStore();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'players', label: 'Players', icon: '👤' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'combinations', label: 'Combinations', icon: '🔗' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ] as const;

  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <header className="bg-white dark:bg-surface-dark text-gridiron-graphite dark:text-white border-b border-gray-200 dark:border-white/10 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <a 
                href="https://thesignalcallers.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Logo size={55} />
              </a>
              <h1 className="text-xl font-heading font-semibold dark:text-white">
                TheSignalCallers
              </h1>
            </div>
          </div>

          <nav className="flex items-center space-x-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors duration-200
                  flex items-center space-x-2
                  ${
                    currentView === item.id
                      ? 'bg-signal-green/10 text-signal-green border border-signal-green/30'
                      : 'text-gridiron-graphite dark:text-white hover:text-signal-green hover:bg-gray-50 dark:hover:bg-gridiron-graphite-light'
                  }
                `}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
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
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
