import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import PlayerAutocomplete from '../ui/PlayerAutocomplete';
import { Loader, Alert, Paper, Title, Text, Group, Slider, Button, Badge, SegmentedControl, NumberInput, Grid } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type { TeamCombination, RosterConstructionCount, Position } from '../../types';
import type { DataTableSortStatus, DataTableProps } from 'mantine-datatable';

const CombinationsView = () => {
  const [view, setView] = useState<'players' | 'rosters'>('players');

  // State for Player Combinations
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [nRounds, setNRounds] = useState<number>(20);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // State for Roster Constructions
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<RosterConstructionCount>>({ columnAccessor: 'count', direction: 'desc' });
  const [positionFilters, setPositionFilters] = useState<Record<Position, { min?: number; max?: number }>>({
    QB: {},
    RB: {},
    WR: {},
    TE: {},
    K: {},
    DST: {}
  });

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['combinations', selectedPlayers, nRounds],
    queryFn: () => apiService.getPlayerCombinations({
      required_players: selectedPlayers,
      n_rounds: nRounds,
      limit: 500,
    }),
    enabled: isSubmitted && selectedPlayers.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const { data: rosterConstructionCounts, isLoading: isRosterConstructionLoading } = useQuery<RosterConstructionCount[], Error>({
    queryKey: ['rosterConstructionCounts'],
    queryFn: apiService.getRosterConstructionCounts,
    enabled: view === 'rosters',
  });

  const [processedRosterData, setProcessedRosterData] = useState<RosterConstructionCount[]>([]);

  const handleFilterChange = (position: Position, type: 'min' | 'max', value: number | string | undefined) => {
    const numValue = value === '' ? undefined : Number(value);
    setPositionFilters(prev => ({ ...prev, [position]: { ...prev[position], [type]: numValue } }));
  };

  const clearFilters = () => {
    setPositionFilters({ QB: {}, RB: {}, WR: {}, TE: {}, K: {}, DST: {} });
  };

  useEffect(() => {
    if (rosterConstructionCounts) {
      const filteredData = rosterConstructionCounts.filter(row => {
        return (Object.keys(positionFilters) as Position[]).every(pos => {
          const { min, max } = positionFilters[pos];
          const value = row[pos] ?? 0;
          if (min !== undefined && value < min) return false;
          if (max !== undefined && value > max) return false;
          return true;
        });
      });

      const sortedData = [...filteredData].sort((a, b) => {
        const aValue = a[sortStatus.columnAccessor as keyof RosterConstructionCount];
        const bValue = b[sortStatus.columnAccessor as keyof RosterConstructionCount];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortStatus.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
      setProcessedRosterData(sortedData);
    }
  }, [rosterConstructionCounts, sortStatus, positionFilters]);

  const handleSearch = () => {
    if (selectedPlayers.length > 0) {
      setIsSubmitted(true);
    }
  };

  const handleClear = () => {
    setSelectedPlayers([]);
    setIsSubmitted(false);
  };

  const records = useMemo(() => data?.combinations ?? [], [data]);
  const totalCombinations = data?.total_combinations ?? records.length;

  const columns = useMemo(() => [
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
          {record.players.map(player => (
            <Badge
              key={`${record.draft_id}-${record.draft_position}-${player}`}
              variant={selectedPlayers.includes(player) ? 'filled' : 'light'}
              color={selectedPlayers.includes(player) ? 'orange' : 'gray'}
              size="sm"
            >
              {player}
            </Badge>
          ))}
        </div>
      )
    },
  ], [selectedPlayers]);

  const rosterConstructionColumns: DataTableProps<RosterConstructionCount>['columns'] = [
    { accessor: 'QB', title: 'QB', textAlign: 'right', sortable: true },
    { accessor: 'RB', title: 'RB', textAlign: 'right', sortable: true },
    { accessor: 'WR', title: 'WR', textAlign: 'right', sortable: true },
    { accessor: 'TE', title: 'TE', textAlign: 'right', sortable: true },
    { accessor: 'count', title: 'Count', textAlign: 'right', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <SegmentedControl
        fullWidth
        value={view}
        onChange={(value) => setView(value as 'players' | 'rosters')}
        data={[
          { label: 'Player Combinations', value: 'players' },
          { label: 'Roster Constructions', value: 'rosters' },
        ]}
        color="orange"
        mb="lg"
      />

      {view === 'players' && (
        <>
          <Paper withBorder shadow="sm" p="lg" radius="md">
            <Title order={2} className="text-navy-900">Player Combinations</Title>
            <Text c="dimmed" mb="xl">Find teams that drafted a specific combination of players within a set number of rounds.</Text>

            <Group grow align="start" className="gap-8">
              <div className="flex-1 min-w-[300px]">
                <Text fw={500} mb="xs">Required Players</Text>
                <PlayerAutocomplete
                  value={selectedPlayers}
                  onChange={setSelectedPlayers}
                  placeholder="e.g., A.J. Brown, CeeDee Lamb"
                />
              </div>
              <div className="flex-1 min-w-[300px]">
                <Text fw={500} mb="xs">Total Round Selection (1-{nRounds})</Text>
                <Slider
                  value={nRounds}
                  onChange={setNRounds}
                  min={1}
                  max={20}
                  step={1}
                  label={(value) => value}
                  marks={[{ value: 1, label: '1' }, { value: 5 }, { value: 10 }, { value: 15 }, { value: 20, label: '20' }]}
                  styles={{ markLabel: { fontSize: '12px' } }}
                />
              </div>
            </Group>

            <Group justify="right" mt="xl">
              <Button variant="default" onClick={handleClear} disabled={isLoading || isFetching}>
                Clear
              </Button>
              <Button
                onClick={handleSearch}
                disabled={selectedPlayers.length === 0 || isLoading || isFetching}
                loading={isLoading || isFetching}
                className="bg-navy-600 hover:bg-navy-700"
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

          {isSubmitted && !isLoading && !isFetching && !error && (
            <Paper withBorder shadow="sm" p={0} radius="md" mt="xl">
              <Title order={4} p="md" className="border-b">Results ({totalCombinations} teams)</Title>
              <DataTable
                withTableBorder
                withColumnBorders
                borderRadius="md"
                shadow="sm"
                minHeight={records.length === 0 ? 150 : 'auto'}
                records={records}
                idAccessor={(record) => `${record.draft_id}-${record.draft_position}`}
                columns={columns}
                noRecordsText="No teams found with this combination. Try expanding your search criteria."
              />
            </Paper>
          )}
        </>
      )}

      {view === 'rosters' && (
        <Paper shadow="sm" p="lg" withBorder>
          <Title order={3} mb="md" className="text-navy-600">Roster Construction Counts</Title>

          <Paper p="md" mb="md" withBorder>
            <Grid align="end">
              {(['QB', 'RB', 'WR', 'TE'] as Position[]).map(pos => (
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={pos}>
                  <Group grow preventGrowOverflow={false} wrap="nowrap">
                    <NumberInput
                      label={`${pos} Min`}
                      value={positionFilters[pos]?.min}
                      onChange={(val) => handleFilterChange(pos, 'min', val)}
                      min={0}
                    />
                    <NumberInput
                      label={`${pos} Max`}
                      value={positionFilters[pos]?.max}
                      onChange={(val) => handleFilterChange(pos, 'max', val)}
                      min={0}
                    />
                  </Group>
                </Grid.Col>
              ))}
              <Grid.Col span={{ base: 12, sm: 'auto' }} >
                <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
              </Grid.Col>
            </Grid>
          </Paper>

          <DataTable<RosterConstructionCount>
            fetching={isRosterConstructionLoading}
            withTableBorder
            withColumnBorders
            borderRadius="sm"
            minHeight={200}
            records={processedRosterData}
            columns={rosterConstructionColumns}
            idAccessor={(record) => `${record.QB}-${record.RB}-${record.WR}-${record.TE}`}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            noRecordsText="No roster data available."
          />
        </Paper>
      )}
    </div>
  );
};

export default CombinationsView;
