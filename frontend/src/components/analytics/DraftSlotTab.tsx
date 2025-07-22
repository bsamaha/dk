import { useState, useMemo } from 'react';
import { useDraftSlotCorrelation } from '../../hooks/useDraftSlotCorrelation';
import {
  NumberInput,
  SegmentedControl,
  Select,
  Loader,
  Alert,
  Popover,
  ActionIcon,
  Table,
  Tooltip,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DraftSlotRow, DraftSlotMetric } from '../../types';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

const metricOptions: { label: string; value: DraftSlotMetric }[] = [
  { label: 'Count', value: 'count' },
  { label: 'Percent', value: 'percent' },
  { label: 'Ratio', value: 'ratio' },
];

const topNOptions = [10, 15, 25, 50, 100].map(n => ({
  label: `Top ${n}`,
  value: n.toString(),
}));

const DraftSlotTab = () => {
  const [slot, setSlot] = useState(1);
  const [metric, setMetric] = useState<DraftSlotMetric>('percent');
  const [topN, setTopN] = useState(25);
  const [infoOpened, setInfoOpened] = useState(false);

  // Theme-aware values
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const axisTickColor = isDark ? '#E5E7EB' : '#4B5563';

  const { data, isLoading, error } = useDraftSlotCorrelation({
    slot,
    metric,
    topN,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.rows.map((row: DraftSlotRow) => ({
      name: row.player,
      value: row.score,
    }));
  }, [data]);

  if (error) {
    return <Alert color="red">Failed to load data: {error.message}</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <NumberInput
          aria-label="Draft slot (1 through 12)"
          label="Draft Slot"
          description="1 – 12"
          min={1}
          max={12}
          value={slot}
          onChange={val => typeof val === 'number' && setSlot(val)}
          className="w-32"
        />

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Metric
          </label>
          <SegmentedControl
            aria-label="Metric selector"
            data={metricOptions}
            value={metric}
            onChange={val => setMetric(val as DraftSlotMetric)}
            color="brand"
          />
        </div>

        <Select
          aria-label="Top N selector"
          label="Top N"
          data={topNOptions}
          value={topN.toString()}
          onChange={val => val && setTopN(parseInt(val, 10))}
          className="w-32"
        />

        {/* Info legend popover */}
        <Popover
          width={400}
          position="bottom"
          withArrow
          shadow="md"
          opened={infoOpened}
          onChange={setInfoOpened}
        >
          <Popover.Target>
            <Tooltip label="How to read this" withArrow>
              <ActionIcon
                variant="light"
                color="brand"
                onClick={() => setInfoOpened(o => !o)}
              >
                <IconInfoCircle size={18} />
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
            <ul className="list-disc list-inside space-y-1 text-sm max-w-xs">
              <li>
                <b>Draft Slot</b>: Select the draft position (1–12) you want to
                analyze.
              </li>
              <li>
                <b>Metric</b>:
                <ul className="list-disc ml-5">
                  <li>
                    <b>Count</b>: Number of unique teams from this slot that
                    drafted the player.
                  </li>
                  <li>
                    <b>Percent</b>: Share of teams from this slot that drafted
                    the player.
                  </li>
                  <li>
                    <b>Ratio</b>: Lift — how much more/less the slot drafts the
                    player compared to overall.
                  </li>
                </ul>
              </li>
              <li>
                <b>Top N</b>: Limit results to the top players by the selected
                metric.
              </li>
              <li>
                The bar chart visualizes the <b>Score</b> (selected metric) for
                each player.
              </li>
              <li>
                The table columns:
                <ul className="list-disc ml-5">
                  <li>
                    <b>Slot Cnt</b>: Teams from the chosen slot drafting the
                    player.
                  </li>
                  <li>
                    <b>Overall Cnt</b>: Total teams that drafted the player.
                  </li>
                  <li>
                    <b>% Slot</b> and <b>% Overall</b>: Percentages of teams.
                  </li>
                  <li>
                    <b>Score</b>: Same as the bar chart value.
                  </li>
                </ul>
              </li>
            </ul>
          </Popover.Dropdown>
        </Popover>
      </div>

      {/* Chart */}
      <div
        className="bg-white dark:bg-surface-dark p-4 rounded-lg card-shadow"
        style={{ height: '400px', minHeight: '300px' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            No data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#555' : '#e5e7eb'}
              />
              <XAxis
                type="number"
                domain={[0, 'auto']}
                tickFormatter={v => (v as number).toFixed(2)}
                tick={{ fill: axisTickColor }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fill: axisTickColor }}
              />
              <RechartsTooltip
                formatter={(v: number) => (v as number).toFixed(3)}
                contentStyle={{
                  backgroundColor: isDark ? '#262626' : '#ffffff',
                  borderColor: isDark ? '#525252' : '#e5e7eb',
                  color: isDark ? '#ffffff' : '#000000',
                }}
                cursor={{
                  fill: isDark ? '#383838' : '#c7c7c7',
                  opacity: 0.2,
                }}
              />
              <Bar dataKey="value" fill="#00A86B" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark p-4 rounded-lg card-shadow overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader />
          </div>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th className="text-center">#</th>
                <th className="text-center">Player</th>
                <th className="text-center">Slot Cnt</th>
                <th className="text-center">Overall Cnt</th>
                <th className="text-center">% Slot</th>
                <th className="text-center">% Overall</th>
                <th className="text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((row: DraftSlotRow, idx: number) => (
                <tr key={row.player}>
                  <td className="text-center">{idx + 1}</td>
                  <td className="text-center">{row.player}</td>
                  <td className="text-center">{row.slot}</td>
                  <td className="text-center">{row.overall}</td>
                  <td className="text-center">
                    {(row.p_slot * 100).toFixed(1)}%
                  </td>
                  <td className="text-center">
                    {(row.p_overall * 100).toFixed(1)}%
                  </td>
                  <td className="text-center">{row.score.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default DraftSlotTab;
