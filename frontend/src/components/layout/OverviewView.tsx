import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';
import { ResponsivePieLabel } from '../ui/ResponsivePieLabel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Select, SegmentedControl, Loader, Alert } from '@mantine/core';
import type { Position } from '../../types';
import { useColorScheme } from '../../contexts/ColorSchemeContext';
import { getTooltipStyle } from '../../utils/chartTheme';

const CHART_COLORS = [
  '#00A86B',
  '#FFC300',
  '#016140',
  '#1E1E1E',
  '#89C4AA',
  '#0891b2',
];

const OverviewView = () => {
  const { isMobile, responsive } = useResponsive();
  const { colorScheme } = useColorScheme();
  const [key, setKey] = useState(0);
  const hasForcedRerender = useRef(false);

  // Theme-aware values
  const isDark = colorScheme === 'dark';
  const tickColor = isDark ? '#ffffff' : '#374151';

  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ['metadata'],
    queryFn: apiService.getMetadata,
  });

  const {
    data: positionStats,
    isLoading: positionStatsLoading,
    error: positionStatsError,
  } = useQuery({
    queryKey: ['positionStats'],
    queryFn: apiService.getPositionStats,
  });

  // State for position analysis controls
  const [selectedPosition, setSelectedPosition] = useState<
    'QB' | 'RB' | 'WR' | 'TE'
  >('QB');
  const [aggregation, setAggregation] = useState<'mean' | 'median'>('mean');
  const [roundChartKey, setRoundChartKey] = useState(0);
  const hasForcedRoundRerender = useRef(false);

  const {
    data: roundCountsData,
    isLoading: roundCountsLoading,
    isError: roundCountsError,
    error: roundCountsErrorObj,
  } = useQuery({
    queryKey: ['roundCounts', selectedPosition, aggregation],
    queryFn: () =>
      apiService.getPositionDraftCountsByRound(
        selectedPosition as Position,
        aggregation
      ),
    // Help recover from prior failed fetches after hot-reload or backend restart
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

  // Calculate derived data with useMemo to avoid re-renders
  const totalDrafted = useMemo(
    () =>
      positionStats?.position_stats.reduce(
        (sum, stat) => sum + stat.total_drafted,
        0
      ) || 0,
    [positionStats]
  );

  const pieData = useMemo(
    () =>
      positionStats?.position_stats.map((stat, index) => ({
        name: stat.position,
        value: totalDrafted ? (stat.total_drafted / totalDrafted) * 100 : 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      })) || [],
    [positionStats, totalDrafted]
  );

  const barData = useMemo(
    () =>
      positionStats?.position_stats.map(stat => ({
        position: stat.position,
        medianDraftCount: stat.median_draft_count,
      })) || [],
    [positionStats]
  );

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[OverviewView] Data state update:', {
        positionStatsLoading,
        positionStats: !!positionStats,
        positionStatsData: positionStats,
        pieData: pieData.length,
        pieDataContent: pieData,
        barData: barData.length,
        barDataContent: barData,
        totalDrafted,
        key,
      });
    }
  }, [
    positionStatsLoading,
    positionStats,
    pieData,
    barData,
    totalDrafted,
    key,
  ]);

  // Force a single re-render once data is available to stabilize charts
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

  // Force a single re-render for the by-round chart when its data becomes available
  useEffect(() => {
    if (
      !hasForcedRoundRerender.current &&
      !roundCountsLoading &&
      roundBarData.length > 0
    ) {
      hasForcedRoundRerender.current = true;
      setRoundChartKey(prev => prev + 1);
    }
  }, [roundCountsLoading, roundBarData.length]);

  // Handle error state for position stats query
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

      {/* Key Metrics */}
      <div className={`grid ${responsive.singleColumnOnMobile} gap-6`}>
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-signal-green/20">
              <span className="text-signal-green text-xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gridiron-graphite dark:text-white">
                Unique Players Drafted
              </p>
              {metadataLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gridiron-graphite dark:text-white">
                  {metadata?.total_players.toLocaleString() || '0'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-audible-gold/10">
              <span className="text-audible-gold text-xl">🏈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gridiron-graphite dark:text-white">
                Total Drafts
              </p>
              {metadataLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gridiron-graphite dark:text-white">
                  {metadata?.total_drafts.toLocaleString() || '0'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-signal-green/10">
              <span className="text-signal-green text-xl">🏆</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gridiron-graphite dark:text-white">
                Total Teams
              </p>
              {metadataLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gridiron-graphite dark:text-white">
                  {metadata?.total_teams.toLocaleString() || '0'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-turf-dark/10">
              <span className="text-turf-dark text-xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gridiron-graphite dark:text-white">
                Total Picks
              </p>
              {metadataLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-bold text-gridiron-graphite dark:text-white">
                  {(metadata?.total_teams
                    ? metadata.total_teams * 20
                    : 0
                  ).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className={`grid ${responsive.chartGrid}`}>
        {/* Position Distribution Pie Chart */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h2 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
            Position Draft Distribution
          </h2>
          <div className="h-80" style={{ minHeight: '320px' }}>
            {positionStatsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader />
              </div>
            ) : !pieData || pieData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer
                key={`pie-container-${key}`}
                width="100%"
                height={320}
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(props: any) => (
                      <ResponsivePieLabel
                        name={props.name}
                        value={props.value ?? 0}
                        cx={props.cx}
                        cy={props.cy}
                        midAngle={props.midAngle}
                        outerRadius={props.outerRadius}
                        isMobile={isMobile}
                      />
                    )}
                    labelLine={false}
                    outerRadius={responsive.pieRadius}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
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
                            <p style={{ margin: 0, color: '#00A86B' }}>
                              {data.value?.toFixed(2)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={responsive.pieLegendHeight}
                    wrapperStyle={{ fontSize: responsive.fontSize.pieLegend }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Median Players Drafted per Team Bar Chart */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h2 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
            Median Players Drafted per Draft Lobby
          </h2>
          <div className="h-80" style={{ minHeight: '320px' }}>
            {positionStatsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader />
              </div>
            ) : !barData || barData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer
                key={`bar-container-${key}`}
                width="100%"
                height={320}
              >
                <BarChart data={barData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#555' : '#e5e7eb'}
                  />
                  <XAxis
                    dataKey="position"
                    fontSize={responsive.fontSize.medium}
                    tick={{ fill: tickColor }}
                    axisLine={{ stroke: tickColor }}
                    tickLine={{ stroke: tickColor }}
                  />
                  <YAxis
                    fontSize={responsive.fontSize.medium}
                    tick={{ fill: tickColor }}
                    axisLine={{ stroke: tickColor }}
                    tickLine={{ stroke: tickColor }}
                  />
                  <Tooltip
                    formatter={(v: number) => v.toFixed(2)}
                    contentStyle={getTooltipStyle(isDark)}
                  />
                  <Bar
                    dataKey="medianDraftCount"
                    name="Median Draft Count"
                    fill="#00A86B"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Position Analysis */}
      <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
        <h2 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
          Position Analysis
        </h2>

        {/* Quick Stats */}
        <div className={`grid ${responsive.positionStatsGrid} mb-6`}>
          {positionStatsLoading ? (
            <>
              {['QB', 'RB', 'WR', 'TE'].map(pos => (
                <div
                  key={pos}
                  className={`text-center border rounded-md ${responsive.positionStatsPadding}`}
                >
                  <p className="uppercase text-xs font-semibold text-gray-500">
                    {pos} Drafted
                  </p>
                  <div className="h-6 w-20 mx-auto mt-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </>
          ) : (
            positionStats?.position_stats.map(stat => (
              <div
                key={stat.position}
                className={`text-center border rounded-md ${responsive.positionStatsPadding}`}
              >
                <p className="uppercase text-xs font-semibold text-gray-500">
                  {stat.position} Drafted
                </p>
                <p
                  className={`text-signal-green mt-1 font-bold ${responsive.statText}`}
                >
                  {stat.total_drafted.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Bar Chart & Controls */}
        <div className={`grid ${responsive.controlsGrid} items-end`}>
          <div className={responsive.controlsColumn}>
            <h3 className="text-center mb-2 font-semibold text-gridiron-graphite dark:text-white">
              Position Stats by Round
            </h3>
            <div className="h-80">
              {roundCountsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader />
                </div>
              ) : roundCountsError ? (
                <div className="flex items-center justify-center h-full">
                  <Alert
                    color="red"
                    title="Failed to load chart"
                    variant="light"
                  >
                    {roundCountsErrorObj instanceof Error
                      ? roundCountsErrorObj.message
                      : 'Unexpected error'}
                  </Alert>
                </div>
              ) : roundBarData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available.
                </div>
              ) : (
                <ResponsiveContainer
                  key={`round-container-${roundChartKey}`}
                  width="100%"
                  height="100%"
                >
                  <BarChart data={roundBarData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#555' : '#e5e7eb'}
                    />
                    <XAxis
                      dataKey="round"
                      fontSize={responsive.fontSize.small}
                      angle={responsive.chartAngle}
                      textAnchor={responsive.chartTextAnchor}
                      height={responsive.chartAxisHeight}
                      tick={{ fill: tickColor }}
                      axisLine={{ stroke: tickColor }}
                      tickLine={{ stroke: tickColor }}
                    />
                    <YAxis
                      fontSize={responsive.fontSize.small}
                      tick={{ fill: tickColor }}
                      axisLine={{ stroke: tickColor }}
                      tickLine={{ stroke: tickColor }}
                    />
                    <Tooltip
                      formatter={(v: number) => v.toFixed(2)}
                      contentStyle={getTooltipStyle(isDark)}
                    />
                    <Bar dataKey="count" name="Count" fill="#00A86B" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className={responsive.controlsMargin}>
            <Select
              label="Position"
              data={['QB', 'RB', 'WR', 'TE'].map(p => ({ value: p, label: p }))}
              value={selectedPosition}
              onChange={v =>
                v && setSelectedPosition(v as 'QB' | 'RB' | 'WR' | 'TE')
              }
              size={responsive.inputSize}
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
