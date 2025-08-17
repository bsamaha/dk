import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { getTooltipStyle, getGridStroke, getAxisTickColor, getBarChartProps } from '../../../utils/chartTheme';
import { useColorScheme } from '../../../contexts/ColorSchemeContext';

type ThemedBarChartProps<T extends Record<string, unknown>> = {
  data: T[];
  layout?: 'horizontal' | 'vertical';
  valueFormatter?: (v: number) => string; // applied only to the numeric axis
  xLabel?: string;
  yDataKey?: string; // defaults to 'value'
  xDataKey?: string; // defaults vary based on layout
  height?: number; // if omitted, fills parent height
  marginLeft?: number;
  marginBottom?: number;
};

export function ThemedBarChart<T extends Record<string, unknown>>({
  data,
  layout = 'vertical',
  valueFormatter,
  xLabel,
  yDataKey = 'value',
  xDataKey,
  height,
  marginLeft = 60,
  marginBottom = 30,
}: ThemedBarChartProps<T>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const axisTickColor = getAxisTickColor(isDark);

  const resolvedXDataKey = xDataKey ?? (layout === 'vertical' ? 'round' : 'category');
  const xIsNumeric = layout === 'vertical';
  const yIsNumeric = layout === 'horizontal';

  return (
    <ResponsiveContainer width="100%" height={height ?? '100%'}>
      <BarChart data={data} layout={layout} margin={{ left: marginLeft, bottom: marginBottom, right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke(isDark)} />
        <XAxis
          type={xIsNumeric ? 'number' : 'category'}
          dataKey={!xIsNumeric ? resolvedXDataKey : undefined}
          tick={{ fill: axisTickColor }}
          label={
            xLabel
              ? { value: xLabel, position: 'insideBottom', offset: -10, style: { fill: axisTickColor } }
              : undefined
          }
          tickFormatter={xIsNumeric && valueFormatter ? (v) => valueFormatter(Number(v)) : undefined}
        />
        <YAxis
          type={yIsNumeric ? 'number' : 'category'}
          dataKey={!yIsNumeric ? resolvedXDataKey : undefined}
          tick={{ fill: axisTickColor }}
          tickFormatter={yIsNumeric && valueFormatter ? (v) => valueFormatter(Number(v)) : undefined}
        />
        <RechartsTooltip formatter={(v: number) => (valueFormatter ? valueFormatter(Number(v)) : v)} contentStyle={getTooltipStyle(isDark)} />
        <Bar dataKey={yDataKey} {...getBarChartProps()} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
