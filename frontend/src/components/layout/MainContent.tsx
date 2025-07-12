import OverviewView from './OverviewView';
import AnalyticsView from './AnalyticsView';
import PlayersView from './PlayersView';

import CombinationsView from './CombinationsView';

interface MainContentProps {
  view: 'overview' | 'players' | 'combinations' | 'analytics';
}

const MainContent = ({ view }: MainContentProps) => {
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
      default:
        return <OverviewView />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-6">
        {renderView()}
      </div>
    </main>
  );
};

export default MainContent;
