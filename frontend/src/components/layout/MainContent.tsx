import { Suspense, lazy } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

const OverviewView = lazy(() => import('./OverviewView'));
const AnalyticsView = lazy(() => import('./AnalyticsView'));
const PlayersView = lazy(() => import('./PlayersView'));
const CombinationsView = lazy(() => import('./CombinationsView'));
const AboutView = lazy(() => import('./AboutView'));
const ToolsView = lazy(() => import('./ToolsView'));

interface MainContentProps {
  view:
    | 'overview'
    | 'players'
    | 'combinations'
    | 'analytics'
    | 'about'
    | 'tools';
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
      case 'tools':
        return <ToolsView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gridiron-graphite-light min-h-0">
      <div className={`${responsive.padding} max-w-full`}>
        <Suspense fallback={<div className="p-6 text-gray-500">Loading…</div>}>
          {renderView()}
        </Suspense>
      </div>
    </main>
  );
};

export default MainContent;
