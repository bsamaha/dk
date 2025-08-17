import React, { useRef } from 'react';
import {
  Table,
  Anchor,
  Collapse,
  Paper,
  Title,
  Text,
  Center,
  Loader,
  Grid,
  Stack,
} from '@mantine/core';
import { useResponsive } from '../../hooks/useResponsive';
import { useColorScheme } from '../../contexts/ColorSchemeContext';
import { getAxisTickColor } from '../../utils/chartTheme';
import { Suspense, lazy } from 'react';
const LazyHistogramChart = lazy(() => import('./HistogramChart'));
import type { Player, PlayerDetails } from '../../types';
import { useVirtualizer } from '@tanstack/react-virtual';

interface PlayerTableProps {
  players: Player[];
  selectedPlayer?: Player | null;
  playerDetailsData?: PlayerDetails | null;
  isPlayerDetailsLoading?: boolean;
  onPlayerClick?: (player: Player) => void;
}

const PlayerTable = ({
  players,
  selectedPlayer,
  playerDetailsData,
  isPlayerDetailsLoading,
  onPlayerClick,
}: PlayerTableProps) => {
  const { isMobile, responsive } = useResponsive();
  // Theme-aware values
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const axisTickColor = getAxisTickColor(isDark);

  // Proceed even if color scheme is not yet available; default styles will apply
  const createHistogramData = (picks: number[]) => {
    if (!picks || picks.length === 0) return [];

    const minPick = Math.min(...picks);
    const maxPick = Math.max(...picks);
    const pickRange = maxPick - minPick;
    const totalPicks = picks.length;

    // Dynamic bucket size based on pick distribution
    let bucketSize: number;
    let maxBuckets: number;

    if (pickRange <= 12) {
      // Very tight distribution (e.g., first round only) - use 1-2 pick buckets
      bucketSize = Math.max(1, Math.ceil(pickRange / 8));
      maxBuckets = 12;
    } else if (pickRange <= 36) {
      // Early rounds (1-3 rounds) - use 3-6 pick buckets
      bucketSize = Math.max(3, Math.ceil(pickRange / 10));
      maxBuckets = 15;
    } else if (pickRange <= 84) {
      // Mid-range distribution (1-7 rounds) - use 6-12 pick buckets
      bucketSize = Math.max(6, Math.ceil(pickRange / 12));
      maxBuckets = 18;
    } else {
      // Wide distribution - use 12-24 pick buckets
      bucketSize = Math.max(12, Math.ceil(pickRange / 15));
      maxBuckets = 20;
    }

    // Ensure we don't have too many buckets for readability
    const numBuckets = Math.min(maxBuckets, Math.ceil(pickRange / bucketSize));

    // Create dynamic bins
    const bins: number[] = [];
    const binLabels: string[] = [];

    for (let i = 0; i < numBuckets; i++) {
      const binStart = minPick + i * bucketSize;
      const binEnd = Math.min(minPick + (i + 1) * bucketSize - 1, maxPick);

      bins.push(binStart);

      if (bucketSize === 1) {
        binLabels.push(`${binStart}`);
      } else {
        binLabels.push(`${binStart}-${binEnd}`);
      }
    }

    // Create histogram with dynamic bins
    const histogram = binLabels
      .map((label, index) => {
        const binStart = bins[index];
        const binEnd = index < bins.length - 1 ? bins[index + 1] - 1 : maxPick;

        const count = picks.filter(
          pick => pick >= binStart && pick <= binEnd
        ).length;
        const percentage = ((count / totalPicks) * 100).toFixed(1);

        return {
          range: label,
          count,
          percentage: parseFloat(percentage),
        };
      })
      .filter(bin => bin.count > 0); // Only show bins with data

    return histogram;
  };

  const rows: React.ReactNode[] = [];
  players.forEach((player, index) => {
    // Player row
    rows.push(
      <Table.Tr key={`${player.name}-${index}`}>
        <Table.Td>
          <Anchor
            component="button"
            fz="sm"
            onClick={() => onPlayerClick?.(player)}
          >
            {player.name}
          </Anchor>
        </Table.Td>
        <Table.Td>{player.position}</Table.Td>
        {!isMobile && <Table.Td>{player.team}</Table.Td>}
        <Table.Td>{player.draft_percentage.toFixed(2)}%</Table.Td>
        <Table.Td>{player.avg_pick?.toFixed(1) ?? 'N/A'}</Table.Td>
        {!isMobile && (
          <Table.Td>
            {player.avg_pick ? Math.ceil(player.avg_pick / 12) : 'N/A'}
          </Table.Td>
        )}
      </Table.Tr>
    );

    // Expansion row if this player is selected
    if (selectedPlayer && selectedPlayer.name === player.name) {
      rows.push(
        <Table.Tr key={`${player.name}-expansion-${index}`}>
          <Table.Td colSpan={isMobile ? 4 : 6} p={0}>
            <Collapse
              in={selectedPlayer?.name === player.name}
              transitionDuration={300}
              keepMounted
            >
              <Paper p="md" m="md" withBorder bg={isDark ? 'dark.7' : 'white'}>
                <Title order={4} mb="md">
                  {selectedPlayer.name} - Draft Analysis
                </Title>

                {isPlayerDetailsLoading ? (
                  <Center p="xl">
                    <Loader />
                  </Center>
                ) : playerDetailsData ? (
                  <Stack gap="md">
                    <Grid>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Position
                        </Text>
                        <Text size="sm" c="dimmed">
                          {playerDetailsData.position}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Team
                        </Text>
                        <Text size="sm" c="dimmed">
                          {playerDetailsData.team}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Total Drafts
                        </Text>
                        <Text size="sm" c="dimmed">
                          {playerDetailsData.total_drafts}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Avg Pick
                        </Text>
                        <Text size="sm" c="dimmed">
                          {playerDetailsData.avg_pick?.toFixed(1) ?? 'N/A'}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Earliest Pick
                        </Text>
                        <Text size="sm" c="dimmed">
                          {Math.min(...(playerDetailsData.picks || []))}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Latest Pick
                        </Text>
                        <Text size="sm" c="dimmed">
                          {Math.max(...(playerDetailsData.picks || []))}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Pick Range
                        </Text>
                        <Text size="sm" c="dimmed">
                          {Math.max(...(playerDetailsData.picks || [])) -
                            Math.min(...(playerDetailsData.picks || []))}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Text size="sm" fw={500}>
                          Avg Round
                        </Text>
                        <Text size="sm" c="dimmed">
                          {playerDetailsData.avg_pick
                            ? Math.ceil(playerDetailsData.avg_pick / 12)
                            : 'N/A'}
                        </Text>
                      </Grid.Col>
                    </Grid>

                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Draft Pick Distribution (Dynamic Bucketing)
                      </Text>
                      <div
                        className="chart-container"
                        style={{
                          backgroundColor: 'transparent',
                          borderRadius: '6px',
                          height: 300,
                        }}
                      >
                        <Suspense fallback={<Center p="xl"><Loader /></Center>}>
                          <LazyHistogramChart
                            data={createHistogramData(playerDetailsData.picks || [])}
                            axisTickColor={axisTickColor}
                            isDark={isDark}
                          />
                        </Suspense>
                      </div>
                      <Text size="xs" c="dimmed" mt="xs">
                        Dynamic bucketing adapts to player distribution. Tighter
                        ranges for early-round players.
                      </Text>
                    </div>
                  </Stack>
                ) : (
                  <Text c="dimmed">No data available for this player.</Text>
                )}
              </Paper>
            </Collapse>
          </Table.Td>
        </Table.Tr>
      );
    }
  });

  const isTestEnv = typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.MODE === 'test';
  const shouldVirtualize = rows.length > 200 && !isTestEnv;
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });
  const virtualItems = shouldVirtualize ? rowVirtualizer.getVirtualItems() : [];

  return (
    <Table.ScrollContainer minWidth={responsive.tableMinWidth}>
      {shouldVirtualize ? (
        <div ref={parentRef} style={{ maxHeight: 600, overflow: 'auto' }}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Player</Table.Th>
                <Table.Th>Position</Table.Th>
                {!isMobile && <Table.Th>Team</Table.Th>}
                <Table.Th>Draft %</Table.Th>
                <Table.Th>Avg. Pick</Table.Th>
                {!isMobile && <Table.Th>Avg. Round</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody style={{ position: 'relative' }}>
              <tr style={{ height: rowVirtualizer.getTotalSize() }} />
              {virtualItems.map(vi => (
                <tr key={vi.key} style={{ position: 'absolute', top: 0, transform: `translateY(${vi.start}px)` }}>
                  <td style={{ padding: 0 }} colSpan={isMobile ? 5 : 7}>
                    {rows[vi.index]}
                  </td>
                </tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      ) : (
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Player</Table.Th>
              <Table.Th>Position</Table.Th>
              {!isMobile && <Table.Th>Team</Table.Th>}
              <Table.Th>Draft %</Table.Th>
              <Table.Th>Avg. Pick</Table.Th>
              {!isMobile && <Table.Th>Avg. Round</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      )}
    </Table.ScrollContainer>
  );
};

export default PlayerTable;
