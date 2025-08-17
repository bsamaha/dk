import { Suspense, lazy } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { Route, Routes, Navigate } from 'react-router-dom';

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
  // Keep prop to avoid breaking tests that may pass it, even though routing below is the source of truth
  void view;

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gridiron-graphite-light min-h-0">
      <div className={`${responsive.padding} max-w-full`}>
        <Suspense fallback={<div className="p-6 text-gray-500">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewView />} />
            <Route path="/players" element={<PlayersView />} />
            <Route path="/combinations" element={<CombinationsView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/about" element={<AboutView />} />
            <Route path="/tools" element={<ToolsView />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </Suspense>
      </div>
    </main>
  );
};

export default MainContent;
