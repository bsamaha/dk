import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
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
import { Select, SegmentedControl, Loader } from '@mantine/core';
import type { Position } from '../../types';
import { useColorScheme } from '../../contexts/ColorSchemeContext';
import { getTooltipStyle } from '../../utils/chartTheme';

const OverviewView = () => {
  const { isMobile, responsive } = useResponsive();
  const { colorScheme } = useColorScheme();

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

  const { data: roundCountsData, isLoading: roundCountsLoading } = useQuery({
    queryKey: ['roundCounts', selectedPosition, aggregation],
    queryFn: () =>
      apiService.getPositionDraftCountsByRound(
        selectedPosition as Position,
        aggregation
      ),
  });

  const roundBarData = useMemo(
    () =>
      roundCountsData?.map(rc => ({
        round: `R${rc.round}`,
        count: rc.count,
      })) || [],
    [roundCountsData]
  );

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

  const colors = [
    '#00A86B',
    '#FFC300',
    '#016140',
    '#1E1E1E',
    '#89C4AA',
    '#0891b2',
  ];

  // Embeds
  const SPOTIFY_EMBED_SRC =
    'https://open.spotify.com/embed/show/5bN7N0PinX56rsSAomHZd8?utm_source=generator';
  const YOUTUBE_URL = 'https://www.youtube.com/@TheSignalCallers/videos';
  const YT_UPLOADS_PLAYLIST_ID =
    (import.meta as any).env?.VITE_YT_UPLOADS_PLAYLIST_ID as
      | string
      | undefined;
  const YT_CHANNEL_ID = (import.meta as any).env?.VITE_YT_CHANNEL_ID as
    | string
    | undefined;
  const deriveUploadsPlaylistId = (channelId?: string): string | undefined => {
    if (!channelId) return undefined;
    return channelId.startsWith('UC') ? `UU${channelId.substring(2)}` : undefined;
  };
  const YT_EFFECTIVE_PLAYLIST_ID =
    YT_UPLOADS_PLAYLIST_ID || deriveUploadsPlaylistId(YT_CHANNEL_ID);

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

  const totalDrafted =
    positionStats?.position_stats.reduce(
      (sum, stat) => sum + stat.total_drafted,
      0
    ) || 0;
  const pieData =
    positionStats?.position_stats.map((stat, index) => ({
      name: stat.position,
      value: totalDrafted ? (stat.total_drafted / totalDrafted) * 100 : 0,
      count: stat.total_drafted,
      color: colors[index % colors.length],
    })) || [];
  const barData =
    positionStats?.position_stats.map(stat => ({
      position: stat.position,
      medianDraftCount: stat.median_draft_count,
    })) || [];

  // Quick stats ordered for display
  const quickOrder: Array<'QB' | 'RB' | 'WR' | 'TE'> = ['QB', 'RB', 'WR', 'TE'];
  const quickStats = quickOrder.map(pos => {
    const s = positionStats?.position_stats.find(ps => ps.position === pos);
    return { position: pos, total: s?.total_drafted ?? 0 };
  });

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

      {/* Key Metrics removed (moved to sidebar) */}

      {/* Charts */}
      <div className={`grid ${responsive.chartGrid}`}>
        {/* Position Distribution + Quick Stats */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
            Position Draft Distribution
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="h-[460px] md:h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
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
                    outerRadius={isMobile ? 120 : 180}
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
                        const data = payload[0] as any;
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
                              {data.value?.toFixed(2)}% · {data.payload?.count?.toLocaleString?.()}
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
            </div>
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickStats.map(stat => (
                  <div
                    key={stat.position}
                    className="text-center border rounded-md p-3"
                  >
                    <p className="uppercase text-xs font-semibold text-gray-500">
                      {stat.position} Drafted
                    </p>
                    <p className="text-signal-green mt-1 font-bold text-lg">
                      {stat.total.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Latest Media on Overview */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
            Latest From The Signal Callers
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2 text-gridiron-graphite dark:text-gray-200">
                Spotify
              </h4>
              <div className="relative w-full max-w-xl mx-auto" style={{ paddingTop: '152px' }}>
                <iframe
                  title="Spotify latest show"
                  src={SPOTIFY_EMBED_SRC}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="absolute top-0 left-0 w-full h-[152px] rounded-lg border-0"
                />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 text-gridiron-graphite dark:text-gray-200">
                YouTube
              </h4>
              {YT_EFFECTIVE_PLAYLIST_ID ? (
                <div className="relative w-full max-w-xl mx-auto" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    title="YouTube latest uploads"
                    src={`https://www.youtube.com/embed?listType=playlist&list=${YT_EFFECTIVE_PLAYLIST_ID}`}
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
                  <code className="font-code"> VITE_YT_CHANNEL_ID</code> to auto‑embed the
                  latest video. For now, visit our channel:
                  <a
                    href={YOUTUBE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-signal-green underline"
                  >
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
        <h4 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
          Position Analysis
        </h4>

        {/* Bar Chart & Controls */}
        <div className={`grid ${responsive.controlsGrid} items-end`}>
          <div className={responsive.controlsColumn}>
            <h5 className="text-center mb-2 font-semibold text-gridiron-graphite dark:text-white">
              Position Stats by Round
            </h5>
            <div className="h-80">
              {roundCountsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
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
