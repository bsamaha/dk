import OverviewView from './OverviewView';
import AnalyticsView from './AnalyticsView';
import PlayersView from './PlayersView';
import CombinationsView from './CombinationsView';
import AboutView from './AboutView';
import { useResponsive } from '../../hooks/useResponsive';

interface MainContentProps {
  view: 'overview' | 'players' | 'combinations' | 'analytics' | 'about';
}

const MainContent = ({ view }: MainContentProps) => {
  const { responsive } = useResponsive();
  const renderView = () => {
    switch (view) {
      case 'overview':
        return <OverviewView />;
      case 'players':
        return <PlayersView />;
      case 'combinations':
        return <CombinationsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'about':
        return <AboutView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gridiron-graphite-light min-h-0">
      <div className={`${responsive.padding} max-w-full`}>{renderView()}</div>
    </main>
  );
};

export default MainContent;
