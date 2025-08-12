import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import PlayerAutocomplete from '../ui/PlayerAutocomplete';
import DistributionChart from '../ui/DistributionChart';
import {
  Loader,
  Alert,
  Paper,
  Title,
  Text,
  Group,
  Slider,
  Button,
  SegmentedControl,
  NumberInput,
  Grid,
  Badge,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type { TeamCombination, RosterConstructionCount } from '../../types';
import type { DataTableSortStatus, DataTableProps } from 'mantine-datatable';

type CorePosition = 'QB' | 'RB' | 'WR' | 'TE';

const CombinationsView = () => {
  const [view, setView] = useState<'players' | 'rosters'>('players');

  // State for Player Combinations
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [nRounds, setNRounds] = useState<number>(20);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // State for Roster Constructions
  const [rosterView, setRosterView] = useState<'table' | 'chart'>('table');
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<RosterConstructionCount>
  >({ columnAccessor: 'count', direction: 'desc' });
  const [positionFilters, setPositionFilters] = useState<
    Record<CorePosition, { min?: number; max?: number }>
  >({
    QB: {},
    RB: {},
    WR: {},
    TE: {},
  });

  const [rosterSelectedPlayers, setRosterSelectedPlayers] = useState<string[]>([]);
  const [chartData, setChartData] = useState<
    Record<CorePosition, { count: number; teams: number }[]>
  >({
    QB: [],
    RB: [],
    WR: [],
    TE: [],
  });

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['combinations', selectedPlayers, nRounds, page],
    queryFn: () =>
      apiService.getPlayerCombinations({
        required_players: selectedPlayers,
        n_rounds: nRounds,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    enabled: isSubmitted && selectedPlayers.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const {
    data: rosterConstructionCounts,
    isLoading: isRosterConstructionLoading,
  } = useQuery<RosterConstructionCount[], Error>({
    queryKey: ['rosterConstructionCounts', rosterSelectedPlayers],
    queryFn: () =>
      apiService.getRosterConstructionCounts(rosterSelectedPlayers),
    enabled: view === 'rosters',
  });

  const [processedRosterData, setProcessedRosterData] = useState<
    RosterConstructionCount[]
  >([]);

  const handleFilterChange = (
    position: CorePosition,
    type: 'min' | 'max',
    value: number | string | undefined
  ) => {
    const numValue = value === '' ? undefined : Number(value);
    setPositionFilters(prev => ({
      ...prev,
      [position]: { ...prev[position], [type]: numValue },
    }));
  };

  const clearFilters = () => {
    setPositionFilters({ QB: {}, RB: {}, WR: {}, TE: {} });
  };

  useEffect(() => {
    if (rosterConstructionCounts) {
      const filteredData = rosterConstructionCounts.filter(row => {
        return (Object.keys(positionFilters) as CorePosition[]).every(pos => {
          const { min, max } = positionFilters[pos];
          const value = row[pos] ?? 0;
          if (min !== undefined && value < min) return false;
          if (max !== undefined && value > max) return false;
          return true;
        });
      });

      const sortedData = [...filteredData].sort((a, b) => {
        const aValue =
          a[sortStatus.columnAccessor as keyof RosterConstructionCount];
        const bValue =
          b[sortStatus.columnAccessor as keyof RosterConstructionCount];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortStatus.direction === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }
        return 0;
      });
      setProcessedRosterData(sortedData);
    }
  }, [rosterConstructionCounts, sortStatus, positionFilters]);

  useEffect(() => {
    if (processedRosterData) {
      const positions: CorePosition[] = ['QB', 'RB', 'WR', 'TE'];
      const newChartData = {} as Record<
        CorePosition,
        { count: number; teams: number }[]
      >;
      positions.forEach(pos => {
        const map = new Map<number, number>();
        processedRosterData.forEach(row => {
          const key = row[pos] ?? 0;
          map.set(key, (map.get(key) ?? 0) + row.count);
        });
        newChartData[pos] = Array.from(map.entries())
          .map(([count, teams]) => ({ count, teams }))
          .sort((a, b) => a.count - b.count);
      });
      setChartData(newChartData);
    }
  }, [processedRosterData]);

  const handleSearch = () => {
    if (selectedPlayers.length > 0) {
      setPage(1);
      setIsSubmitted(true);
    }
  };

  const handleClear = () => {
    setSelectedPlayers([]);
    setIsSubmitted(false);
    setPage(1);
  };

  const records = useMemo(() => data?.combinations ?? [], [data]);
  const totalCombinations = data?.total_combinations ?? records.length;
  // totalPages is derived by DataTable internally via totalRecords/recordsPerPage

  const columns = useMemo(
    () => [
      {
        accessor: 'draft_id',
        title: 'Draft #',
        width: 100,
        textAlignment: 'center',
      },
      {
        accessor: 'draft_position',
        title: 'Draft Slot',
        width: 100,
        textAlignment: 'center',
      },
      {
        accessor: 'position_counts',
        title: 'Position Counts',
        width: 200,
      },
      {
        accessor: 'players',
        title: 'Roster',
        render: (record: TeamCombination) => (
          <div className="flex flex-wrap gap-1">
            {record.players.map(player => {
              const isRequired = selectedPlayers
                .map(p => p.toLowerCase())
                .includes(player.toLowerCase());
              return (
                <Badge
                  key={`${record.draft_id}-${record.draft_position}-${player}`}
                  size="sm"
                  radius="sm"
                  color={isRequired ? 'gold' : 'gray'}
                  variant={isRequired ? 'filled' : 'light'}
                >
                  {player}
                </Badge>
              );
            })}
          </div>
        ),
      },
    ],
    [selectedPlayers]
  );

  const rosterConstructionColumns: DataTableProps<RosterConstructionCount>['columns'] =
    [
      { accessor: 'QB', title: 'QB', textAlign: 'right', sortable: true },
      { accessor: 'RB', title: 'RB', textAlign: 'right', sortable: true },
      { accessor: 'WR', title: 'WR', textAlign: 'right', sortable: true },
      { accessor: 'TE', title: 'TE', textAlign: 'right', sortable: true },
      { accessor: 'count', title: 'Count', textAlign: 'right', sortable: true },
    ];

  return (
    <div className="space-y-6 text-gridiron-graphite dark:text-white">
      <SegmentedControl
        fullWidth
        value={view}
        onChange={value => setView(value as 'players' | 'rosters')}
        data={[
          { label: 'Player Combinations', value: 'players' },
          { label: 'Roster Constructions', value: 'rosters' },
        ]}
        color="brand"
        mb="lg"
      />

      {view === 'players' && (
        <>
          <Paper
            withBorder
            shadow="sm"
            p="lg"
            radius="md"
            className="bg-white dark:bg-surface-dark-elev"
          >
            <Title
              order={2}
              className="text-gridiron-graphite dark:text-white font-heading"
            >
              Player Combinations
            </Title>
            <Text c="dimmed" mb="xl">
              Find teams that drafted a specific combination of players within a
              set number of rounds.
            </Text>

            <Group grow align="start" className="gap-8">
              <div className="flex-1 min-w-[300px]">
                <Text fw={500} mb="xs">
                  Required Players
                </Text>
                <PlayerAutocomplete
                  multiple
                  value={selectedPlayers}
                  onChange={setSelectedPlayers}
                  placeholder="e.g., A.J. Brown"
                />
              </div>
              <div className="flex-1 min-w-[300px]">
                <Text fw={500} mb="xs">
                  Total Round Selection (1-{nRounds})
                </Text>
                <Slider
                  value={nRounds}
                  onChange={setNRounds}
                  min={1}
                  max={20}
                  step={1}
                  label={value => value}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 5 },
                    { value: 10 },
                    { value: 15 },
                    { value: 20, label: '20' },
                  ]}
                  styles={{ markLabel: { fontSize: '12px' } }}
                />
              </div>
            </Group>

            <Group justify="right" mt="xl">
              <Button
                variant="default"
                onClick={handleClear}
                disabled={isLoading || isFetching}
              >
                Clear
              </Button>
              <Button
                onClick={handleSearch}
                disabled={
                  selectedPlayers.length === 0 || isLoading || isFetching
                }
                loading={isLoading || isFetching}
                className="bg-signal-green hover:bg-turf-dark"
              >
                Find Teams
              </Button>
            </Group>
          </Paper>

          {(isLoading || isFetching) && (
            <div className="flex justify-center items-center h-64">
              <Loader size="lg" />
              <Text ml="md">Searching for combinations...</Text>
            </div>
          )}

          {error && (
            <Alert title="Error" color="red" variant="light">
              Failed to fetch player combinations. Please try again.
            </Alert>
          )}

          {data && !isLoading && !isFetching && !error && (
            <Paper
              withBorder
              shadow="sm"
              p={0}
              radius="md"
              mt="xl"
              className="bg-white dark:bg-surface-dark-elev"
            >
              <Title order={4} p="md" className="border-b font-heading">
                Results ({totalCombinations} teams)
              </Title>
              <DataTable
                withTableBorder
                withColumnBorders
                borderRadius="md"
                shadow="sm"
                minHeight={records.length === 0 ? 150 : 'auto'}
                records={records}
                idAccessor={record =>
                  `${record.draft_id}-${record.draft_position}`
                }
                columns={columns}
                noRecordsText="No teams found with this combination. Try expanding your search criteria."
                totalRecords={totalCombinations}
                recordsPerPage={pageSize}
                page={page}
                onPageChange={setPage}
              />
            </Paper>
          )}
        </>
      )}

      {view === 'rosters' && (
        <Paper
          shadow="sm"
          p="lg"
          withBorder
          className="bg-white dark:bg-surface-dark-elev max-w-full overflow-hidden"
        >
          <Title
            order={3}
            mb="md"
            className="text-gridiron-graphite dark:text-white"
          >
            Roster Construction Counts
          </Title>

          <SegmentedControl
            value={rosterView}
            onChange={value => setRosterView(value as 'table' | 'chart')}
            data={[
              { label: 'Table View', value: 'table' },
              { label: 'Chart View', value: 'chart' },
            ]}
            color="brand"
            mb="lg"
          />

          <Paper
            p="md"
            mb="md"
            withBorder
            className="bg-white dark:bg-surface-dark-elev border-signal-green/20"
          >
            <Text
              fw={500}
              mb="md"
              className="text-signal-green dark:text-audible-gold"
            >
              Filter Roster Combinations
            </Text>

            <Group grow align="start" className="gap-8" mb="md">
              <div className="flex-1 min-w-[300px]">
                <Text
                  fw={500}
                  mb="xs"
                  className="text-gridiron-graphite dark:text-white"
                >
                  Required Players
                </Text>
                <PlayerAutocomplete
                  multiple
                  value={rosterSelectedPlayers}
                  onChange={setRosterSelectedPlayers}
                  placeholder="e.g., A.J. Brown"
                />
              </div>
            </Group>

            <Grid align="end">
              {(['QB', 'RB', 'WR', 'TE'] as CorePosition[]).map(pos => (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={pos}>
                  <Group grow preventGrowOverflow={false} wrap="nowrap">
                    <NumberInput
                      label={`${pos} Min`}
                      value={positionFilters[pos]?.min}
                      onChange={val => handleFilterChange(pos, 'min', val)}
                      min={1}
                      styles={{
                        label: {
                          color: 'var(--color-signal-green)',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                        },
                        input: {
                          borderColor: 'var(--color-signal-green)',
                          fontFamily: 'Inter, sans-serif',
                          '&:focus': {
                            borderColor: 'var(--color-signal-green)',
                            boxShadow: '0 0 0 1px var(--color-signal-green)',
                          },
                        },
                      }}
                    />
                    <NumberInput
                      label={`${pos} Max`}
                      value={positionFilters[pos]?.max}
                      onChange={val => handleFilterChange(pos, 'max', val)}
                      min={1}
                      styles={{
                        label: {
                          color: 'var(--color-signal-green)',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                        },
                        input: {
                          borderColor: 'var(--color-signal-green)',
                          fontFamily: 'Inter, sans-serif',
                          '&:focus': {
                            borderColor: 'var(--color-signal-green)',
                            boxShadow: '0 0 0 1px var(--color-signal-green)',
                          },
                        },
                      }}
                    />
                  </Group>
                </Grid.Col>
              ))}
              <Grid.Col span={{ base: 12, sm: 'auto' }}>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="border-signal-green text-signal-green hover:bg-signal-green hover:text-white transition-colors"
                >
                  Clear Filters
                </Button>
              </Grid.Col>
            </Grid>
          </Paper>

          {rosterView === 'table' && (
            <div className="border border-signal-green/20 rounded-md overflow-hidden">
              <DataTable<RosterConstructionCount>
                fetching={isRosterConstructionLoading}
                withTableBorder
                withColumnBorders
                borderRadius="sm"
                minHeight={200}
                records={processedRosterData}
                columns={rosterConstructionColumns}
                idAccessor={record =>
                  `${record.QB}-${record.RB}-${record.WR}-${record.TE}`
                }
                sortStatus={sortStatus}
                onSortStatusChange={setSortStatus}
                noRecordsText="No roster data available."
                styles={{
                  table: {
                    borderColor: 'var(--color-signal-green)',
                  },
                  header: {
                    backgroundColor: 'rgba(0, 168, 107, 0.05)',
                    borderBottom: '2px solid var(--color-signal-green)',
                  },
                }}
              />
            </div>
          )}

          {rosterView === 'chart' && (
            <div className="w-full overflow-hidden">
              <Grid gutter="lg" className="w-full">
                {(['QB', 'RB', 'WR', 'TE'] as CorePosition[]).map(pos => (
                  <Grid.Col span={{ base: 12, md: 6 }} key={pos}>
                    <DistributionChart
                      title={`${pos} Distribution`}
                      data={chartData[pos]}
                      position={pos}
                    />
                  </Grid.Col>
                ))}
              </Grid>
            </div>
          )}
        </Paper>
      )}
    </div>
  );
};

export default CombinationsView;
