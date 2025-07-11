import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { apiService } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Select, SegmentedControl, Loader } from '@mantine/core';

const OverviewView = () => {
  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ['metadata'],
    queryFn: apiService.getMetadata,
  });

  const { data: positionStats, isLoading: positionStatsLoading } = useQuery({
    queryKey: ['positionStats'],
    queryFn: apiService.getPositionStats,
  });

  // State for position analysis controls
  const [selectedPosition, setSelectedPosition] = useState<'QB' | 'RB' | 'WR' | 'TE'>('QB');
  const [aggregation, setAggregation] = useState<'mean' | 'median'>('mean');

  const { data: roundCountsData, isLoading: roundCountsLoading } = useQuery({
    queryKey: ['roundCounts', selectedPosition, aggregation],
    queryFn: () => apiService.getPositionDraftCountsByRound(selectedPosition as any, aggregation),
  });

  const roundBarData = useMemo(
    () =>
      roundCountsData?.round_counts.map((rc) => ({
        round: `R${rc.round}`,
        count: rc.count,
      })) || [],
    [roundCountsData]
  );

  const colors = ['#1e3a8a', '#f97316', '#059669', '#dc2626', '#7c2d12', '#0891b2'];

  // Compute total drafted to convert counts to percentage values
  const totalDrafted = positionStats?.position_stats.reduce(
    (sum, stat) => sum + stat.total_drafted,
    0
  ) || 0;

  const pieData = positionStats?.position_stats.map((stat, index) => ({
    name: stat.position,
    value: totalDrafted ? (stat.total_drafted / totalDrafted) * 100 : 0,
    color: colors[index % colors.length]
  })) || [];

  const barData = positionStats?.position_stats.map((stat) => ({
    position: stat.position,
    medianDraftCount: stat.median_draft_count,
  })) || [];

  if (metadataLoading || positionStatsLoading) {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">
          Draftkings Bestball Milly Maker Draft Analytics
        </h1>
        <p className="text-gray-600 mb-2">
          Comprehensive analysis of DK fantasy football draft patterns and player selections
        </p>
        <div className="text-xs text-gray-500">Last Updated: June 27, 2025</div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-navy-100">
              <span className="text-navy-600 text-xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Players Drafted</p>
              <p className="text-2xl font-bold text-navy-900">
                {metadata?.total_players.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <span className="text-orange-600 text-xl">🏈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Drafts</p>
              <p className="text-2xl font-bold text-navy-900">
                {metadata?.total_drafts.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <span className="text-green-600 text-xl">🏆</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-navy-900">
                {metadata?.total_teams.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <span className="text-purple-600 text-xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Picks</p>
              <p className="text-2xl font-bold text-navy-900">
                {(metadata?.total_teams ? metadata.total_teams * 20 : 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">
            Position Draft Distribution
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  label={({ name, value }: any) => `${name}: ${(value ?? 0).toFixed(1)}%`}
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Median Players Drafted per Team Bar Chart */}
        <div className="bg-white p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">
            Median Players Drafted per Draft Lobby
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="position" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="medianDraftCount" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Position Analysis */}
      <div className="bg-white p-6 rounded-lg card-shadow">
        <h4 className="text-lg font-semibold text-navy-900 mb-4">Position Analysis</h4>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {positionStats?.position_stats.map((stat) => (
            <div
              key={stat.position}
              className="text-center border rounded-md p-4"
            >
              <p className="uppercase text-xs font-semibold text-gray-500">
                {stat.position} Drafted
              </p>
              <p className="text-navy-600 mt-1 text-xl font-bold">
                {stat.total_drafted.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Bar Chart & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
          <div className="lg:col-span-3">
            <h5 className="text-center mb-2 font-semibold text-navy-900">
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
                    <XAxis dataKey="round" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => v.toFixed(2)} />
                    <Bar dataKey="count" fill="#1e3a8a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Controls */}
          <div>
            <Select
              label="View by Position"
              data={['QB', 'RB', 'WR', 'TE'].map((p) => ({ value: p, label: p }))}
              value={selectedPosition}
              onChange={(v) => v && setSelectedPosition(v as any)}
            />
            <SegmentedControl
              fullWidth
              className="mt-4"
              data={[
                { label: 'Average', value: 'mean' },
                { label: 'Median', value: 'median' },
              ]}
              value={aggregation}
              onChange={(val) => setAggregation(val as any)}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default OverviewView;
