// import { useQuery } from '@tanstack/react-query';
import { useQueryPlus } from '../../hooks/useQueryPlus';
import { useState, useMemo, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';
import { useYouTubePlaylistId } from '../../hooks/useMediaEmbeds';
import { useQuickStats } from '../../hooks/useQuickStats';
import { ResponsivePieLabel } from '../ui/ResponsivePieLabel';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ThemedBarChart } from '../ui/charts/ThemedBarChart';
import { Select, SegmentedControl, Loader, Alert } from '@mantine/core';
import type { Position } from '../../types';
import { useColorScheme } from '../../contexts/ColorSchemeContext';
import { PositionLegend } from '../ui/PositionLegend';
import { isCorePosition, CHART_COLORS_CORE } from '../../utils/chartTheme';
import { useCorePieData } from '../../hooks/useCorePieData';

const OverviewView = () => {
  const { isMobile, responsive } = useResponsive();
  const { colorScheme } = useColorScheme();
  const [key, setKey] = useState(0);
  const hasForcedRerender = useRef(false);

  // Theme-aware values
  const isDark = colorScheme === 'dark';

  // Shared chart color map to keep legend and segments in sync (brand-based)
  const chartColors = CHART_COLORS_CORE;

  const { isLoading: metadataLoading } = useQueryPlus({
    queryKey: ['metadata'],
    queryFn: ({ signal }) => apiService.getMetadata(signal),
    refetchOnMount: false,
  });

  const {
    data: positionStats,
    isLoading: positionStatsLoading,
    error: positionStatsError,
  } = useQueryPlus({
    queryKey: ['positionStats'],
    queryFn: ({ signal }) => apiService.getPositionStats(signal),
    refetchOnMount: false,
  });

  // State for position analysis controls
  const [selectedPosition, setSelectedPosition] = useState<
    'QB' | 'RB' | 'WR' | 'TE'
  >('QB');
  const [aggregation, setAggregation] = useState<'mean' | 'median'>('mean');
  // Removed roundChartKey since ThemedBarChart manages internal rendering

  const {
    data: roundCountsData,
    isLoading: roundCountsLoading,
    isError: roundCountsError,
    error: roundCountsErrorObj,
  } = useQueryPlus({
    queryKey: ['roundCounts', selectedPosition, aggregation],
    queryFn: ({ signal }) =>
      apiService.getPositionDraftCountsByRound(
        selectedPosition as Position,
        aggregation,
        signal
      ),
    retry: 2,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const roundBarData = useMemo(
    () =>
      roundCountsData?.map(rc => ({
        round: `R${rc.round}`,
        count: rc.count,
      })) || [],
    [roundCountsData]
  );

  // Embeds
  const YOUTUBE_URL = 'https://www.youtube.com/@TheSignalCallers/videos';
  const YT_UPLOADS_PLAYLIST_ID =
    (import.meta as ImportMeta).env?.VITE_YT_UPLOADS_PLAYLIST_ID as
      | string
      | undefined;
  const YT_CHANNEL_ID = (import.meta as ImportMeta).env?.VITE_YT_CHANNEL_ID as
    | string
    | undefined;
  const YT_EFFECTIVE_PLAYLIST_ID = useYouTubePlaylistId(
    YT_UPLOADS_PLAYLIST_ID,
    YT_CHANNEL_ID
  );

  // Quick stats and pie data
  const quickStats = useQuickStats(positionStats);
  const pieData = useCorePieData(positionStats);
  const CORE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;

  // Stabilize charts once on data ready
  useEffect(() => {
    if (
      !hasForcedRerender.current &&
      !positionStatsLoading &&
      positionStats &&
      pieData.length > 0
    ) {
      hasForcedRerender.current = true;
      setKey(prev => prev + 1);
    }
  }, [positionStatsLoading, positionStats, pieData.length]);

  // no-op: previous forced re-render logic is no longer necessary

  if (positionStatsError) {
    if (import.meta.env.DEV) {
      console.error('Position Stats Query Error:', positionStatsError);
    }
    return (
      <div className="text-red-600 dark:text-red-400">
        Error loading position statistics. Please try again later.
      </div>
    );
  }

  if (metadataLoading || positionStatsLoading || roundCountsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gridiron-graphite dark:text-white">
      <div>
        <h1 className="text-2xl font-heading font-bold mb-2">
          Draftkings Bestball Milly Maker Draft Analytics
        </h1>
        <p className="text-gridiron-graphite dark:text-gray-300 mb-2">
          Comprehensive analysis of DK fantasy football draft patterns and
          player selections
        </p>
        <div className="text-xs text-gridiron-graphite/70 dark:text-gray-400">
          Last Updated: June 27, 2025
        </div>
      </div>

      {/* Charts */}
      <div className={`grid ${responsive.chartGrid}`}>
        {/* Position Distribution + Quick Stats */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h2 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
            Position Draft Distribution
          </h2>
          <div className="grid grid-cols-1 gap-6 pt-2 md:pt-4">
            <div className={`${responsive.pieContainerHeight} ${responsive.pieContainerMargin} flex flex-col items-center justify-center`}>
              <div className="w-full h-full max-w-[640px]">
                <ResponsiveContainer key={`pie-container-${key}`} width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: isMobile ? 50 : 40, bottom: 20, left: isMobile ? 50 : 40 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      label={(props: { name?: string; value?: number; cx?: number; cy?: number; midAngle?: number; outerRadius?: number }) => (
                        <ResponsivePieLabel
                          name={props.name ?? ''}
                          value={props.value ?? 0}
                          cx={props.cx ?? 0}
                          cy={props.cy ?? 0}
                          midAngle={props.midAngle ?? 0}
                          outerRadius={props.outerRadius ?? 0}
                          isMobile={isMobile}
                        />
                      )}
                      labelLine={false}
                      outerRadius={isMobile ? 110 : 140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: { count?: number } }> }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const positionName = (data.name ?? '') as string;
                          const color = isCorePosition(positionName)
                            ? chartColors[positionName]
                            : chartColors.WR;
                          return (
                            <div
                              style={{
                                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                                border: `1px solid ${isDark ? '#016140' : '#E5E7EB'}`,
                                borderRadius: '6px',
                                boxShadow: isDark
                                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                color: isDark ? '#FFFFFF' : '#1F2937',
                                padding: '10px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <p
                                style={{
                                  margin: '0 0 6px 0',
                                  fontWeight: 600,
                                }}
                              >
                                {data.name}
                              </p>
                              <p style={{ margin: 0, color }}>
                                {data.value?.toFixed(2)}% · {data.payload?.count?.toLocaleString?.()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Legend moved outside to avoid overlay/clipping */}
                  </PieChart>
                </ResponsiveContainer>
                <PositionLegend colors={chartColors} />
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {(quickStats.length ? quickStats.map(s => s.position) : CORE_POSITIONS).map((pos, idx) => (
                  <div key={`${pos}-${idx}`} className="text-center border rounded-md p-3">
                    <p className="uppercase text-xs font-semibold text-gray-500">{pos} Drafted</p>
                    {quickStats.length ? (
                      <p className="text-signal-green mt-1 font-bold text-lg">
                        {quickStats.find(s => s.position === pos)?.total.toLocaleString()}
                      </p>
                    ) : (
                      <div className="h-6 w-20 mx-auto mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Latest Media on Overview */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">Latest From The Signal Callers</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2 text-gridiron-graphite dark:text-gray-200">YouTube</h4>
              {YT_EFFECTIVE_PLAYLIST_ID ? (
                <div className="relative w-full max-w-lg mx-auto" style={{ paddingTop: '40%' }}>
                  <iframe
                    title="YouTube latest uploads"
                    src={`https://www.youtube-nocookie.com/embed?listType=playlist&list=${YT_EFFECTIVE_PLAYLIST_ID}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    loading="lazy"
                    className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set <code className="font-code">VITE_YT_UPLOADS_PLAYLIST_ID</code> or
                  <code className="font-code"> VITE_YT_CHANNEL_ID</code> to auto‑embed the latest video. For now, visit our channel:
                  <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="ml-1 text-signal-green underline">
                    YouTube @TheSignalCallers
                  </a>
                  .
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Position Analysis */}
      <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
        <h2 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">Position Analysis</h2>

        <div className={`grid ${responsive.controlsGrid} items-end`}>
          <div className={responsive.controlsColumn}>
            <h3 className="text-center mb-2 font-semibold text-gridiron-graphite dark:text-white">Position Stats by Round</h3>
            <div className={responsive.chartHeight}>
              {roundCountsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader />
                </div>
              ) : roundCountsError ? (
                <div className="flex items-center justify-center h-full">
                  <Alert color="red" title="Failed to load chart" variant="light">
                    {roundCountsErrorObj instanceof Error ? roundCountsErrorObj.message : 'Unexpected error'}
                  </Alert>
                </div>
              ) : roundBarData.length === 0 ? (
                <div className="flex items-center justify-center h_full text-gray-500">No data available.</div>
              ) : (
                <ThemedBarChart
                  data={roundBarData}
                  layout="horizontal"
                  xLabel="Round"
                  valueFormatter={(v: number) => Math.round(v).toString()}
                  yDataKey="count"
                  xDataKey="round"
                  marginBottom={40}
                />
              )}
            </div>
          </div>

          {/* Controls */}
          <div className={responsive.controlsMargin}>
            <Select
              label="Position"
              data={['QB', 'RB', 'WR', 'TE'].map(p => ({ value: p, label: p }))}
              value={selectedPosition}
              onChange={v => v && setSelectedPosition(v as 'QB' | 'RB' | 'WR' | 'TE')}
              size={responsive.inputSize}
              classNames={{
                input: 'bg-white dark:bg-surface-dark-elev text-gridiron-graphite dark:text-white',
                dropdown: 'bg-white dark:bg-surface-dark-elev',
                option: 'text-gridiron-graphite dark:text-white',
                label: 'text-gridiron-graphite dark:text-gray-300',
              }}
            />
            <SegmentedControl
              fullWidth
              className="mt-4"
              data={[
                { label: 'Average', value: 'mean' },
                { label: 'Median', value: 'median' },
              ]}
              value={aggregation}
              onChange={val => setAggregation(val as 'mean' | 'median')}
              size={responsive.inputSize}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
