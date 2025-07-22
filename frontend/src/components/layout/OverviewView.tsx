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

// Custom tooltip component for better styling
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
        <p className="text-gray-900 dark:text-white font-medium mb-1">
          {label}
        </p>
        <p className="text-signal-green font-semibold">
          {payload[0].value} players
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for pie chart (shows percentages)
const PieTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
        <p className="text-gray-900 dark:text-white font-medium mb-1">
          {payload[0].name}
        </p>
        <p className="text-signal-green font-semibold">
          {payload[0].value.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

const OverviewView = () => {
  const { isMobile, responsive } = useResponsive();

  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ['metadata'],
    queryFn: apiService.getMetadata,
  });

  const { data: positionStats, isLoading: positionStatsLoading } = useQuery({
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
      roundCountsData?.round_counts.map(rc => ({
        round: `R${rc.round}`,
        count: rc.count,
      })) || [],
    [roundCountsData]
  );

  const colors = [
    '#00A86B',
    '#FFC300',
    '#016140',
    '#1E1E1E',
    '#89C4AA',
    '#0891b2',
  ];

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
      color: colors[index % colors.length],
    })) || [];
  const barData =
    positionStats?.position_stats.map(stat => ({
      position: stat.position,
      medianDraftCount: stat.median_draft_count,
    })) || [];

  return (
    <div className="space-y-6 text-gridiron-graphite dark:text-white">
      <div>
        <h1 className="text-2xl font-heading font-bold mb-2">
          Draftkings Bestball Milly Maker Draft Analytics
        </h1>
        <p className="text-gray-300 mb-2">
          Comprehensive analysis of DK fantasy football draft patterns and
          player selections
        </p>
        <div className="text-xs text-gray-400">Last Updated: June 27, 2025</div>
      </div>

      {/* Key Metrics */}
      <div className={`grid ${responsive.singleColumnOnMobile} gap-6`}>
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-signal-green/20">
              <span className="text-signal-green text-xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">
                Unique Players Drafted
              </p>
              <p className="text-2xl font-bold">
                {metadata?.total_players.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-audible-gold/10">
              <span className="text-audible-gold text-xl">🏈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Total Drafts</p>
              <p className="text-2xl font-bold">
                {metadata?.total_drafts.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-signal-green/10">
              <span className="text-signal-green text-xl">🏆</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Total Teams</p>
              <p className="text-2xl font-bold">
                {metadata?.total_teams.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-turf-dark/10">
              <span className="text-turf-dark text-xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-300">Total Picks</p>
              <p className="text-2xl font-bold">
                {(metadata?.total_teams
                  ? metadata.total_teams * 20
                  : 0
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className={`grid ${responsive.chartGrid}`}>
        {/* Position Distribution Pie Chart */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
            Position Draft Distribution
          </h3>
          <div className={responsive.chartHeight}>
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
                  outerRadius={responsive.pieRadius}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  content={<PieTooltip />}
                />
                <Legend
                  verticalAlign="bottom"
                  height={responsive.pieLegendHeight}
                  wrapperStyle={{ fontSize: responsive.fontSize.pieLegend }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Median Players Drafted per Team Bar Chart */}
        <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
            Median Players Drafted per Draft Lobby
          </h3>
          <div className={responsive.chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="position"
                  fontSize={responsive.fontSize.medium}
                  tick={{ fill: 'white' }}
                />
                <YAxis
                  fontSize={responsive.fontSize.medium}
                  tick={{ fill: 'white' }}
                />
                <Tooltip
                  formatter={(v: number) => v.toFixed(2)}
                  content={<CustomTooltip />}
                />
                <Bar dataKey="medianDraftCount" fill="#00A86B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Position Analysis */}
      <div className="bg-white dark:bg-surface-dark-elev p-6 rounded-lg card-shadow">
        <h4 className="text-lg font-semibold text-gridiron-graphite dark:text-white mb-4">
          Position Analysis
        </h4>

        {/* Quick Stats */}
        <div className={`grid ${responsive.positionStatsGrid} mb-6`}>
          {positionStats?.position_stats.map(stat => (
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
          ))}
        </div>

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
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="round"
                      fontSize={responsive.fontSize.small}
                      angle={responsive.chartAngle}
                      textAnchor={responsive.chartTextAnchor}
                      height={responsive.chartAxisHeight}
                      tick={{ fill: 'white' }}
                    />
                    <YAxis
                      fontSize={responsive.fontSize.small}
                      tick={{ fill: 'white' }}
                    />
                    <Tooltip
                      formatter={(v: number) => v.toFixed(2)}
                      content={<CustomTooltip />}
                    />
                    <Bar dataKey="count" fill="#00A86B" />
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
