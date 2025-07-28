import { useState, useMemo } from 'react';
import { useWeek17Bringback } from '../../hooks/useWeek17Bringback';
import {
  SegmentedControl,
  Select,
  Loader,
  Alert,
  Text,
  Box,
} from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Week17BringBackPlayer, Week17Scope } from '../../types';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

// Position colors based on brand book
const POSITION_COLORS = {
  QB: '#00A86B', // Signal Green
  RB: '#FFC300', // Audible Gold
  WR: '#016140', // Turf Dark Green
  TE: '#1E1E1E', // Gridiron Graphite
  K: '#89C4AA', // Lighter green
  DST: '#0891b2', // Blue-ish
};

// Sample teams and players for demo (in production, these would come from metadata)
const TEAMS = [
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LV',
  'LAC',
  'LAR',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WSH',
].map(team => ({ label: team, value: team }));

const TOP_PLAYERS = [
  'Josh Allen',
  'Lamar Jackson',
  'Patrick Mahomes',
  'Joe Burrow',
  'Dak Prescott',
  'Christian McCaffrey',
  'Derrick Henry',
  'Saquon Barkley',
  'Austin Ekeler',
  'Tony Pollard',
  'Tyreek Hill',
  'Stefon Diggs',
  'Davante Adams',
  'DeAndre Hopkins',
  'Mike Evans',
  'Travis Kelce',
  'Mark Andrews',
  'George Kittle',
  'T.J. Hockenson',
  'Kyle Pitts',
].map(player => ({ label: player, value: player }));

const Week17BringBackTab = () => {
  const [scope, setScope] = useState<Week17Scope>('team');
  const [entity, setEntity] = useState<string>('');

  // Theme-aware values
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const axisTickColor = isDark ? '#E5E7EB' : '#4B5563';

  const { data, isLoading, error } = useWeek17Bringback({
    scope,
    entity,
    enabled: !!entity,
    limit: 15,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.players.map((player: Week17BringBackPlayer) => ({
      name: player.player,
      value: player.percentage,
      position: player.position,
      color:
        POSITION_COLORS[player.position as keyof typeof POSITION_COLORS] ||
        '#666666',
    }));
  }, [data]);

  if (error) {
    return <Alert color="red">Failed to load data: {error.message}</Alert>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <Text size="sm" fw={500} mb="xs">
            View Scope
          </Text>
          <SegmentedControl
            value={scope}
            onChange={value => {
              setScope(value as Week17Scope);
              setEntity(''); // Reset entity when scope changes
            }}
            data={[
              { label: 'Team View', value: 'team' },
              { label: 'Player View', value: 'player' },
            ]}
            fullWidth
            size="sm"
          />
        </div>

        <div className="flex-1">
          <Text size="sm" fw={500} mb="xs">
            {scope === 'team' ? 'Select Team' : 'Select Player'}
          </Text>
          <Select
            placeholder={
              scope === 'team' ? 'Choose a team...' : 'Choose a player...'
            }
            data={scope === 'team' ? TEAMS : TOP_PLAYERS}
            value={entity}
            onChange={value => setEntity(value || '')}
            searchable
            clearable
            size="sm"
          />
        </div>
      </div>

      {/* Info Section */}
      {data && (
        <Box
          p="sm"
          sm-p="md"
          bg={isDark ? '#262626' : '#f8f9fa'}
          style={{ borderRadius: '8px' }}
        >
          <Text size="xs" sm-size="sm" c="dimmed" className="break-words">
            <strong>Week 17 Matchup:</strong> {data.entity} vs{' '}
            {data.opponent || 'N/A'}
          </Text>
          <Text size="xs" sm-size="sm" c="dimmed" className="break-words">
            <strong>View:</strong>{' '}
            {scope === 'team'
              ? `Top players from ${data.opponent || 'opponent'} by draft percentage`
              : `${data.opponent || 'Opponent'} players most often drafted with ${data.entity}`}
          </Text>
        </Box>
      )}

      {/* Chart */}
      <div className="h-[400px] sm:h-[500px] lg:h-[700px] px-2 sm:px-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader />
          </div>
        ) : !entity ? (
          <div className="text-center text-gray-500 mt-16 sm:mt-32 px-4">
            <div className="text-base sm:text-lg font-medium mb-2">
              Select a {scope} to view Week 17 bring back data
            </div>
            <div className="text-xs sm:text-sm">
              Choose from the dropdown above to see correlation opportunities
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-gray-500 mt-16 sm:mt-32 px-4">
            <div className="text-base sm:text-lg font-medium mb-2">
              No data available
            </div>
            <div className="text-xs sm:text-sm">
              Try selecting a different {scope}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                left: 10,
                right: window.innerWidth < 640 ? 20 : 80,
                top: window.innerWidth < 640 ? 15 : 30,
                bottom: window.innerWidth < 640 ? 15 : 30,
              }}
              barCategoryGap="15%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#555' : '#e5e7eb'}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                domain={[0, 'auto']}
                tickFormatter={value => `${value.toFixed(1)}%`}
                tick={{
                  fill: axisTickColor,
                  fontSize: window.innerWidth < 640 ? '10px' : '12px',
                }}
                axisLine={{ stroke: axisTickColor }}
                tickLine={{ stroke: axisTickColor }}
                label={{
                  value: 'Draft Percentage',
                  position: 'insideBottom',
                  offset: window.innerWidth < 640 ? -10 : -15,
                  style: {
                    textAnchor: 'middle',
                    fill: axisTickColor,
                    fontSize: window.innerWidth < 640 ? '11px' : '13px',
                    fontWeight: 500,
                  },
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={window.innerWidth < 640 ? 100 : 150}
                tick={{
                  fill: axisTickColor,
                  fontSize: window.innerWidth < 640 ? '10px' : '12px',
                  textAnchor: 'end',
                  fontWeight: 500,
                }}
                tickFormatter={value =>
                  window.innerWidth < 640
                    ? value.length > 12
                      ? value.substring(0, 12) + '...'
                      : value
                    : value
                }
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        style={{
                          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                          borderColor: isDark ? '#525252' : '#e5e7eb',
                          color: isDark ? '#ffffff' : '#000000',
                          border: '1px solid',
                          borderRadius: '8px',
                          padding: window.innerWidth < 640 ? '8px' : '12px',
                          fontSize: window.innerWidth < 640 ? '12px' : '13px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          maxWidth: window.innerWidth < 640 ? '200px' : 'none',
                        }}
                      >
                        <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>
                          {data.name}
                        </p>
                        <p
                          style={{
                            margin: '0 0 2px 0',
                            color: '#666',
                            fontSize: window.innerWidth < 640 ? '10px' : '11px',
                          }}
                        >
                          Position: {data.position}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            color: '#00A86B',
                            fontSize: window.innerWidth < 640 ? '13px' : '14px',
                            fontWeight: 600,
                          }}
                        >{`${data.value.toFixed(1)}%`}</p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{
                  fill: isDark ? '#383838' : '#f3f4f6',
                  opacity: 0.3,
                }}
              />
              <Bar
                dataKey="value"
                fill="#00A86B"
                radius={[
                  0,
                  window.innerWidth < 640 ? 4 : 6,
                  window.innerWidth < 640 ? 4 : 6,
                  0,
                ]}
                barSize={window.innerWidth < 640 ? 25 : 35}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Week17BringBackTab;
