import { useState, useMemo } from 'react';
import {
  Container,
  Grid,
  Paper,
  Title,
  Text,
  Button,
  Pagination,
  Select,
  Box,
  Center,
  Loader,
  Alert,
  MultiSelect,
  TextInput
} from '@mantine/core';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../../services/api';
import type { Position, Player } from '../../types';
import PlayerTable from '../ui/PlayerTable';
import PlayerAutocomplete from '../ui/PlayerAutocomplete';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';

// Custom hook for fetching player data
const usePlayers = (page: number, positions: Position[], playerNames: string[], searchTerm: string) => {
  return useQuery({
    queryKey: ['players', page, positions, playerNames, searchTerm],
    queryFn: () => {
      // Combine selected players and search term for the API call
      let combinedSearchTerm = '';
      if (playerNames.length > 0 && searchTerm.trim()) {
        // If both are present, prioritize selected players but include search term
        combinedSearchTerm = playerNames.join(' ') + ' ' + searchTerm.trim();
      } else if (playerNames.length > 0) {
        combinedSearchTerm = playerNames.join(' ');
      } else if (searchTerm.trim()) {
        combinedSearchTerm = searchTerm.trim();
      }
      
      return apiService.getPlayers({
        offset: (page - 1) * 20,
        limit: 20,
        positions: positions.length > 0 ? positions : undefined,
        search_term: combinedSearchTerm || undefined
      });
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Custom hook for fetching position stats
const usePositionStats = () => {
  return useQuery({
    queryKey: ['position-stats'],
    queryFn: apiService.getPositionStats,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

const positionOrder: Position[] = ['QB', 'RB', 'WR', 'TE'];

const PlayersView = () => {
  // State for filters
  const [activePage, setActivePage] = useState(1);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // State for chart controls
  const [selectedPositionForChart, setSelectedPositionForChart] = useState<Position | 'ALL'>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // API data fetching
  const {
    data: playersData,
    isFetching: isPlayersFetching,
    error: playersError,
  } = usePlayers(activePage, activePositions, selectedPlayers, searchTerm);

  const {
    data: positionStatsData,
    isLoading: isPositionStatsLoading,
    error: positionStatsError
  } = usePositionStats();

  // Memoized derived state
  const players = useMemo(() => playersData?.players || [], [playersData]);
  const totalPages = useMemo(() => playersData?.page_info?.total_pages ?? 1, [playersData]);

  // Fetch player details when a player is selected
  const { data: playerDetailsData, isLoading: isPlayerDetailsLoading } = useQuery({
    queryKey: ['playerDetails', selectedPlayer?.name, selectedPlayer?.position, selectedPlayer?.team],
    queryFn: () => selectedPlayer ? apiService.getPlayerDetails(selectedPlayer.name, selectedPlayer.position, selectedPlayer.team) : null,
    enabled: !!selectedPlayer,
  });



  // Handlers
  const handleClearFilters = () => {
    setActivePositions([]);
    setSelectedPlayers([]);
    setSearchTerm('');
    setActivePage(1);
  };

  const handlePageChange = (page: number) => {
    setActivePage(page);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  const handlePlayerClick = (player: Player) => {
    console.log('Player clicked:', player);
    console.log('Current selectedPlayer:', selectedPlayer);
    const newSelectedPlayer = selectedPlayer?.name === player.name ? null : player;
    console.log('Setting selectedPlayer to:', newSelectedPlayer);
    setSelectedPlayer(newSelectedPlayer);
  };

  // Memoized chart data
  const positionChartData = useMemo(() => {
    if (!positionStatsData?.position_stats) return [];

    // Filter data based on selected position
    const filteredStats = selectedPositionForChart === 'ALL' 
      ? positionStatsData.position_stats
      : positionStatsData.position_stats.filter(stat => stat.position === selectedPositionForChart);

    // Create a new structure suitable for Recharts
    const chartData = filteredStats.map(stat => ({
      position: stat.position,
      'Unique Players': stat.unique_players,
      'Total Drafted': stat.total_drafted,
      'Median Draft Count': stat.median_draft_count,
    }));

    return chartData;
  }, [positionStatsData, selectedPositionForChart]);

  const renderStatCard = (title: string, value: number | string, isLoading: boolean) => (
    <Paper withBorder p="md" radius="md" className="text-center">
      <Text size="xs" c="dimmed" className="uppercase font-semibold">{title}</Text>
      {isLoading ? (
        <Center className="h-6"><Loader size="sm" /></Center>
      ) : (
        <Text size="xl" fw={700} className="text-navy-600 mt-1">{value}</Text>
      )}
    </Paper>
  );

  return (
    <Container fluid className="p-4">
      <Title order={2} className="mb-6 text-navy-700">Player Analysis</Title>

      {/* Player Search Section */}
      <Paper withBorder shadow="sm" p="lg" radius="md" className="mb-8">
        <Title order={4} className="mb-4 text-navy-600">Player Search & Filters</Title>
        <Grid align="flex-end">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Search by player name (e.g., Dobbins)..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <PlayerAutocomplete
              value={selectedPlayers}
              onChange={setSelectedPlayers}
              placeholder="Or select specific players..."
            />
          </Grid.Col>
        </Grid>
        
        <Grid mt="sm">
          <Grid.Col span={{ base: 12, md: 8 }}>
            {(selectedPlayers.length > 0 || searchTerm.trim()) && (
              <Text size="sm" c="dimmed">
                {searchTerm.trim() && `Searching for: "${searchTerm.trim()}" `}
                {selectedPlayers.length > 0 && `Selected players: ${selectedPlayers.join(', ')}`}
              </Text>
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              fullWidth
            >
              Clear All Filters
            </Button>
          </Grid.Col>
        </Grid>

        <Box mt="lg">
          <Text size="sm" fw={500} mb="xs">Filter by Position:</Text>
          <MultiSelect
            data={positionOrder.map(pos => ({ label: pos, value: pos }))}
            value={activePositions}
            onChange={(value) => setActivePositions(value as Position[])}
            placeholder="Filter by position..."
            clearable
          />
        </Box>

        <Box mt="xl">
          {isPlayersFetching ? (
            <Center className="h-64"><Loader color="blue" /></Center>
          ) : playersError ? (
            <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
              Failed to load players: {playersError.message}
            </Alert>
          ) : players.length === 0 ? (
            <Center className="h-64"><Text>No players found matching your criteria.</Text></Center>
          ) : (
            <>
              <PlayerTable 
                players={players} 
                selectedPlayer={selectedPlayer}
                playerDetailsData={playerDetailsData}
                isPlayerDetailsLoading={isPlayerDetailsLoading}
                onPlayerClick={handlePlayerClick}
              />
              {/* Temporarily render without Collapse for debugging */}
              <Center mt="lg">
                <Pagination
                  total={totalPages}
                  value={activePage}
                  onChange={handlePageChange}
                  withEdges
                />
              </Center>
            </>
          )}
        </Box>
      </Paper>

      {/* Position Analysis Section */}
      <Paper withBorder shadow="sm" p="lg" radius="md">
        <Title order={4} className="mb-4 text-navy-600">Position Analysis</Title>

        {positionStatsError && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="lg">
            Failed to load position statistics. Some charts may not be available.
          </Alert>
        )}

        <Grid>
          {positionOrder.map(pos => (
            <Grid.Col span={{ base: 6, sm: 4, md: 2 }} key={pos}>
              {renderStatCard(
                `${pos} Drafted`,
                positionStatsData?.position_stats.find(p => p.position === pos)?.total_drafted ?? 'N/A',
                isPositionStatsLoading
              )}
            </Grid.Col>
          ))}
        </Grid>

        <Grid mt="xl" align="flex-end">
          <Grid.Col span={{ base: 12, md: 9 }}>
            <Title order={5} ta="center" mb="xs">Position Stats</Title>
            <Box className="h-80">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={positionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="position" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Unique Players" fill="#8884d8" />
                  <Bar dataKey="Total Drafted" fill="#82ca9d" />
                  <Bar dataKey="Median Draft Count" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="View by Position"
              value={selectedPositionForChart}
              onChange={(value) => setSelectedPositionForChart(value as Position | 'ALL')}
              data={[
                { value: 'ALL', label: 'All Positions' },
                ...positionOrder.map(pos => ({ value: pos, label: pos }))
              ]}
              disabled={isPositionStatsLoading}
            />
          </Grid.Col>
        </Grid>
      </Paper>
    </Container>
  );
};

export default PlayersView;