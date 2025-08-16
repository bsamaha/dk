import { useState, useMemo } from 'react';
import { useWeek17Bringback } from '../../hooks/useWeek17Bringback';
import { useQueryPlus } from '../../hooks/useQueryPlus';
import { apiService } from '../../services/api';
import {
  SegmentedControl,
  Select,
  Loader,
  Alert,
  Text,
  Box,
  ActionIcon,
  Tooltip,
  Popover,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
//
import { ThemedBarChart } from '../ui/charts/ThemedBarChart';
import type { Week17BringBackPlayer, Week17Scope } from '../../types';
import { useColorScheme } from '../../contexts/ColorSchemeContext';
import { POSITION_COLORS } from '../../utils/chartTheme';

import { useWindowSize } from '../../hooks/useWindowSize';

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

const Week17BringBackTab = () => {
  const [scope, setScope] = useState<Week17Scope>('team');
  const [entity, setEntity] = useState<string>('');
  const [infoOpened, setInfoOpened] = useState(false);
  const [selectionInfoOpened, setSelectionInfoOpened] = useState(false);
  const { width: windowWidth } = useWindowSize();

  // Theme-aware values
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // keep for possible styling downstream

  // Fetch all players from metadata
  const { data: metadataData } = useQueryPlus({
    queryKey: ['metadata'],
    queryFn: ({ signal }) => apiService.getMetadata(signal),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Memoize player options
  const playerOptions = useMemo(() => {
    if (!metadataData?.all_players) {
      return [];
    }
    return metadataData.all_players.map(player => ({
      label: player,
      value: player,
    }));
  }, [metadataData]);

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
          <div className="flex items-center gap-2 mb-xs min-h-[36px]">
            <Text size="sm" fw={500}>
              View Scope
            </Text>
            <Popover
              width={400}
              position="bottom"
              withArrow
              shadow="md"
              opened={infoOpened}
              onChange={setInfoOpened}
            >
              <Popover.Target>
                <Tooltip label="How to read this chart" withArrow>
                  <ActionIcon
                    variant="light"
                    color="brand"
                    size="xl"
                    onClick={() => setInfoOpened(o => !o)}
                  >
                    <IconInfoCircle size={24} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown
                className={`${
                  isDark
                    ? 'bg-[#016140] text-white border-[#016140]'
                    : 'bg-white text-[#016140] border-[#016140]'
                }`}
              >
                <div className="space-y-3 text-sm">
                  <div>
                    <Text fw={600} size="sm" mb="xs">
                      Team View
                    </Text>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>
                        Shows top players from your selected team's Week 17
                        opponent
                      </li>
                      <li>
                        <strong>Percentage = General draft frequency</strong>
                      </li>
                      <li>
                        100% means the player is drafted in 100% of all drafts
                      </li>
                      <li>
                        Use this to find the most popular opponent players to
                        stack with
                      </li>
                    </ul>
                  </div>
                  <div>
                    <Text fw={600} size="sm" mb="xs">
                      Player View
                    </Text>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>
                        Shows opponent players most often drafted with your
                        selected player
                      </li>
                      <li>
                        <strong>Percentage = Co-drafting frequency</strong>
                      </li>
                      <li>
                        50% means when your player is drafted, this opponent
                        player is also drafted 50% of the time
                      </li>
                      <li>
                        Use this to find the best specific stacking partners
                      </li>
                    </ul>
                  </div>
                </div>
              </Popover.Dropdown>
            </Popover>
          </div>
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
          <div className="flex items-center gap-2 mb-xs min-h-[36px]">
            <Text size="sm" fw={500}>
              {scope === 'team' ? 'Select Team' : 'Select Player'}
            </Text>
            <Popover
              width={350}
              position="bottom"
              withArrow
              shadow="md"
              opened={selectionInfoOpened}
              onChange={setSelectionInfoOpened}
            >
              <Popover.Target>
                <Tooltip label="How selection works" withArrow>
                  <ActionIcon
                    variant="light"
                    color="brand"
                    size="xl"
                    onClick={() => setSelectionInfoOpened(o => !o)}
                  >
                    <IconInfoCircle size={24} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown
                className={`${
                  isDark
                    ? 'bg-[#016140] text-white border-[#016140]'
                    : 'bg-white text-[#016140] border-[#016140]'
                }`}
              >
                <div className="space-y-3 text-sm">
                  {scope === 'team' ? (
                    <div>
                      <Text fw={600} size="sm" mb="xs">
                        Team Selection
                      </Text>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Select the team you're interested in analyzing</li>
                        <li>
                          The chart will show players from that team's Week 17
                          opponent
                        </li>
                        <li>
                          Example: Select "BUF" → see players from "PHI"
                          (Buffalo's Week 17 opponent)
                        </li>
                        <li>
                          Use this to find opponent players to stack with your
                          team's stars
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <Text fw={600} size="sm" mb="xs">
                        Player Selection
                      </Text>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>
                          Select the player you want to build stacks around
                        </li>
                        <li>
                          The chart shows opponents most often drafted with your
                          player
                        </li>
                        <li>
                          Example: Select "Josh Allen" → see Bills' Week 17
                          opponents who pair well
                        </li>
                        <li>
                          Use this to find the best specific stacking
                          combinations
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </Popover.Dropdown>
            </Popover>
          </div>
          <Select
            placeholder={
              scope === 'team' ? 'Choose a team...' : 'Choose a player...'
            }
            data={scope === 'team' ? TEAMS : playerOptions}
            value={entity}
            onChange={value => setEntity(value || '')}
            searchable
            clearable
            size="sm"
          />
        </div>
      </div>

      {/* Enhanced Info Section */}
      {data && (
        <Box
          p="sm"
          sm-p="md"
          bg={isDark ? '#262626' : '#f8f9fa'}
          style={{ borderRadius: '8px' }}
        >
          <Text size="xs" sm-size="sm" c="dimmed" className="break-words mb-2">
            <strong>Week 17 Matchup:</strong> {data.entity} vs{' '}
            {data.opponent || 'N/A'}
          </Text>
          <Text size="xs" sm-size="sm" c="dimmed" className="break-words mb-2">
            <strong>Analysis:</strong>{' '}
            {scope === 'team'
              ? `Top ${data.players.length} players from ${data.opponent || 'opponent'} by general draft percentage`
              : `Top ${data.players.length} ${data.opponent || 'opponent'} players most often drafted with ${data.entity}`}
          </Text>
          <Text size="xs" sm-size="sm" c="dimmed" className="break-words">
            <strong>Percentage Meaning:</strong>{' '}
            {scope === 'team'
              ? 'How often each player is drafted across all teams (100% = drafted in every single draft)'
              : `How often each player is drafted when ${data.entity} is also on the team (50% = co-drafted half the time)`}
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
          <ThemedBarChart
            data={chartData}
            layout="vertical"
            xLabel="Draft Percentage"
            valueFormatter={(v: number) => `${v.toFixed(1)}%`}
            yDataKey="value"
            xDataKey="name"
            height={windowWidth < 640 ? 400 : 700}
            marginLeft={windowWidth < 640 ? 100 : 150}
          />
        )}
      </div>
    </div>
  );
};

export default Week17BringBackTab;
