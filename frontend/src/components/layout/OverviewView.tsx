import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const OverviewView = () => {
  const { data: metadata, isLoading: metadataLoading } = useQuery({
    queryKey: ['metadata'],
    queryFn: apiService.getMetadata,
  });

  const { data: positionStats, isLoading: positionStatsLoading } = useQuery({
    queryKey: ['positionStats'],
    queryFn: apiService.getPositionStats,
  });

  const colors = ['#1e3a8a', '#f97316', '#059669', '#dc2626', '#7c2d12', '#0891b2'];

  const pieData = positionStats?.position_stats.map((stat, index) => ({
    name: stat.position,
    value: stat.total_drafted,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          Fantasy Football Draft Analytics
        </h1>
        <p className="text-gray-600 mb-2">
          Comprehensive analysis of fantasy football draft patterns and player selections
        </p>
        <div className="text-xs text-gray-500">Last Updated: June 27, 2025</div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg card-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-navy-100">
              <span className="text-navy-600 text-xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Players</p>
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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">
            Position Draft Distribution
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >

                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Median Players Drafted per Team Bar Chart */}
        <div className="bg-white p-6 rounded-lg card-shadow">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">
            Median Players Drafted per Team
          </h3>
          <div className="h-80">
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

      {/* Position Stats Table */}
      <div className="bg-white rounded-lg card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-navy-900">
            Position Statistics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Drafted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Players
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Median Players Drafted
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positionStats?.position_stats.map((stat) => (
                <tr key={stat.position} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-800">
                      {stat.position}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.total_drafted.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.unique_players.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.median_draft_count.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;
