import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { getTooltipStyle } from '../../../utils/chartTheme';
import { useColorScheme } from '../../../contexts/ColorSchemeContext';

type ThemedPieChartProps = {
  data: Array<{ name: string; value: number; color?: string }>;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
};

export function ThemedPieChart({ data, innerRadius = 60, outerRadius = 90, height = 260 }: ThemedPieChartProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius}>
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color || '#00A86B'} />
            ))}
          </Pie>
          <RechartsTooltip contentStyle={getTooltipStyle(isDark)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
