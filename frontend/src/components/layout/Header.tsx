
import { useAppStore } from '../../store/appStore';

const Header = () => {
  const { currentView, setCurrentView } = useAppStore();
  
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'players', label: 'Players', icon: '👤' },

    { id: 'combinations', label: 'Combinations', icon: '🔗' },
  ] as const;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-bold">FF</span>
              </div>
              <h1 className="text-xl font-bold text-navy-900">
                Fantasy Football Analytics
              </h1>
            </div>
          </div>
          
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors duration-200
                  flex items-center space-x-2
                  ${currentView === item.id
                    ? 'bg-navy-100 text-navy-900 border border-navy-200'
                    : 'text-gray-600 hover:text-navy-700 hover:bg-gray-50'
                  }
                `}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
