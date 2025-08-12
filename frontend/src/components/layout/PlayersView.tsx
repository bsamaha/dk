import { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Title,
  Grid,
  Paper,
  Button,
  Text,
  Box,
  MultiSelect,
  Center,
  Loader,
  Alert,
  Pagination,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { apiService } from '../../services/api';
import PlayerAutocomplete from '../ui/PlayerAutocomplete';
import PlayerTable from '../ui/PlayerTable';
import type { Player, Position } from '../../types';

import { useGoogleAnalytics } from '../../hooks/useGoogleAnalytics';
import { useAnalyticsDebounce } from '../../hooks/useDebounce';

// Custom hook for fetching player data
const usePlayers = (
  page: number,
  positions: Position[],
  playerNames: string[]
) => {
  return useQuery({
    queryKey: ['players', page, positions, playerNames],
    queryFn: () => {
      // Use selected players for the API call
      const searchTerm = playerNames.length > 0 ? playerNames.join(' ') : '';

      return apiService.getPlayers({
        offset: (page - 1) * 20,
        limit: 20,
        positions: positions.length > 0 ? positions : undefined,
        search_term: searchTerm || undefined,
      });
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

const positionOrder: Position[] = ['QB', 'RB', 'WR', 'TE'];

const PlayersView = () => {
  const {
    trackPlayerSearch,
    trackPlayerDetails,
    trackPositionFilter,
    debugGAStatus,
  } = useGoogleAnalytics();

  // Create debounced version of trackPlayerSearch
  const debouncedTrackPlayerSearch = useAnalyticsDebounce(
    trackPlayerSearch,
    2000
  );

  // State for filters
  const [activePage, setActivePage] = useState(1);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  const [selectedPlayerDetails, setSelectedPlayerDetails] =
    useState<Player | null>(null);

  // API data fetching
  const {
    data: playersData,
    isFetching: isPlayersFetching,
    error: playersError,
  } = usePlayers(activePage, activePositions, selectedPlayer ? [selectedPlayer] : []);

  const { data: playerDetailsData, isLoading: isPlayerDetailsLoading } =
    useQuery({
      queryKey: [
        'playerDetails',
        selectedPlayerDetails?.name,
        selectedPlayerDetails?.position,
        selectedPlayerDetails?.team,
      ],
      queryFn: () =>
        selectedPlayerDetails
          ? apiService.getPlayerDetails(
              selectedPlayerDetails.name,
              selectedPlayerDetails.position,
              selectedPlayerDetails.team
            )
          : null,
      enabled: !!selectedPlayerDetails,
    });

  // Memoized derived state
  const players = useMemo(() => playersData?.players || [], [playersData]);
  const totalPages = useMemo(
    () => playersData?.page_info?.total_pages ?? 1,
    [playersData]
  );

  // Debug GA status on component mount (development only)
  useEffect(() => {
    if (import.meta.env.DEV && debugGAStatus) {
      debugGAStatus();
    }
  }, [debugGAStatus]);

  // Track player selection when data loads
  useEffect(() => {
    if (playersData && selectedPlayer) {
      debouncedTrackPlayerSearch(selectedPlayer, playersData.total_count || 0);
    }
  }, [playersData, selectedPlayer, debouncedTrackPlayerSearch]);

  // Handlers
  const handleClearFilters = () => {
    setActivePositions([]);
    setSelectedPlayer('');
    setActivePage(1);
  };

  const handlePageChange = (page: number) => {
    setActivePage(page);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  const handlePlayerClick = (player: Player) => {
    const newSelectedPlayer =
      selectedPlayerDetails?.name === player.name ? null : player;
    setSelectedPlayerDetails(newSelectedPlayer);

    // Track player details view
    if (newSelectedPlayer) {
      trackPlayerDetails(
        newSelectedPlayer.name,
        newSelectedPlayer.position,
        newSelectedPlayer.team
      );
    }
  };

  const hasFilters = selectedPlayer !== '' || activePositions.length > 0;

  return (
    <div className="w-full p-4 text-gridiron-graphite dark:text-white">
      <Title
        order={2}
        className="mb-6 text-gridiron-graphite dark:text-white font-heading"
      >
        Player Analysis
      </Title>

      {/* Player Search Section */}
      <Paper
        withBorder
        shadow="sm"
        p="lg"
        radius="md"
        className="mb-8 bg-white dark:bg-surface-dark-elev"
      >
        <Box className="flex justify-between items-center mb-4">
          <Title order={4} className="text-white">
            Player Search & Filters
          </Title>
          {hasFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              size="sm"
              color="red"
            >
              Clear All Filters
            </Button>
          )}
        </Box>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text size="sm" fw={500} mb="xs">
              Search Player:
            </Text>
              <PlayerAutocomplete
                multiple={false}
                value={selectedPlayer}
                onChange={setSelectedPlayer}
                placeholder="Search and select a player..."
              />
              {selectedPlayer && (
                <Text size="sm" c="dimmed" mt="xs">
                  Selected: {selectedPlayer}
                </Text>
              )}
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text size="sm" fw={500} mb="xs">
              Filter by Position:
            </Text>
            <MultiSelect
              data={positionOrder.map(pos => ({ label: pos, value: pos }))}
              value={activePositions}
              onChange={value => {
                setActivePositions(value as Position[]);
                // Track position filter changes (including clearing)
                if (value.length > 0) {
                  trackPositionFilter(value.join(', '));
                } else {
                  trackPositionFilter('none'); // Track when filter is cleared
                }
              }}
              placeholder="Filter by position..."
              clearable
            />
            {activePositions.length > 0 && (
              <Text size="sm" c="dimmed" mt="xs">
                Filtering: {activePositions.join(', ')}
              </Text>
            )}
          </Grid.Col>
        </Grid>

        <Box mt="xl">
          {isPlayersFetching ? (
            <Center className="h-64">
              <Loader color="blue" />
            </Center>
          ) : playersError ? (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Error"
              color="red"
            >
              Failed to load players: {playersError.message}
            </Alert>
          ) : players.length === 0 ? (
            <Center className="h-64">
              <Text>No players found matching your criteria.</Text>
            </Center>
          ) : (
            <>
              <PlayerTable
                players={players}
                selectedPlayer={selectedPlayerDetails}
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
    </div>
  );
};

export default PlayersView;
