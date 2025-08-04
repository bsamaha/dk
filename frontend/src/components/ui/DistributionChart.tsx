import { Paper, Title, Text } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

type DistributionChartProps = {
  title: string;
  data: { count: number; teams: number }[];
  position: 'QB' | 'RB' | 'WR' | 'TE';
};

const DistributionChart = ({
  title,
  data,
  position,
}: DistributionChartProps) => {
  // Theme-aware values
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const chartData = useMemo(() => {
    return data.map(item => ({
      count: item.count,
      teams: item.teams,
    }));
  }, [data]);

  const yAxisTickFormatter = (value: number) => {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}k`;
    }
    return `${value}`;
  };

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const max = Math.max(...chartData.map(item => item.teams));
    return Math.ceil(max * 1.15); // Add 15% buffer for value labels
  }, [chartData]);

  return (
    <Paper
      withBorder
      p="lg"
      radius="md"
      className="bg-white dark:bg-gray-900"
      style={{ height: '400px' }}
    >
      <Title
        order={4}
        mb="md"
        className="text-gridiron-graphite dark:text-white font-heading text-center"
      >
        {title}
      </Title>
      {chartData.length > 0 ? (
        <>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#555' : '#e5e7eb'}
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="count"
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  axisLine={{ stroke: isDark ? '#555' : '#9CA3AF' }}
                  tickLine={{ stroke: isDark ? '#555' : '#9CA3AF' }}
                />
                <YAxis
                  tickFormatter={yAxisTickFormatter}
                  tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                  axisLine={{ stroke: isDark ? '#555' : '#9CA3AF' }}
                  tickLine={{ stroke: isDark ? '#555' : '#9CA3AF' }}
                  domain={[0, maxValue]}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toLocaleString()} teams`,
                    'Teams',
                  ]}
                  labelFormatter={label => `Number of ${position}s: ${label}`}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#016140' : '#E5E7EB'}`,
                    borderRadius: '6px',
                    boxShadow: isDark
                      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: isDark ? '#FFFFFF' : '#1F2937',
                  }}
                />
                <Bar
                  dataKey="teams"
                  name="Teams"
                  fill="#00A86B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1">
            <Text
              size="sm"
              className="text-gridiron-graphite dark:text-white text-center font-medium"
            >
              X-Axis: Number of {position}s
            </Text>
            <Text
              size="xs"
              className="text-gridiron-graphite/70 dark:text-gray-300 text-center"
            >
              Chart shows distribution of team roster constructions
            </Text>
          </div>
        </>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ height: '320px' }}
        >
          <Text className="text-gray-400">
            No data available for {position}
          </Text>
        </div>
      )}
    </Paper>
  );
};

export default DistributionChart;
