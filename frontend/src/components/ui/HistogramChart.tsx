import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { getGridStroke, getBarChartProps } from '../../utils/chartTheme';

export type HistogramBin = {
  range: string;
  count: number;
  percentage: number;
};

type HistogramChartProps = {
  data: HistogramBin[];
  axisTickColor: string;
  isDark: boolean;
};

export default function HistogramChart({ data, axisTickColor, isDark }: HistogramChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke(isDark)} />
        <XAxis
          dataKey="range"
          angle={-45}
          textAnchor="end"
          height={60}
          fontSize={12}
          tick={{ fill: axisTickColor }}
          axisLine={{ stroke: axisTickColor }}
          tickLine={{ stroke: axisTickColor }}
        />
        <YAxis
          fontSize={12}
          tick={{ fill: axisTickColor }}
          axisLine={{ stroke: axisTickColor }}
          tickLine={{ stroke: axisTickColor }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const bin = payload[0]?.payload as HistogramBin;
              return (
                <div
                  style={{
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#016140' : '#E5E7EB'}`,
                    borderRadius: '6px',
                    boxShadow: isDark
                      ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: isDark ? '#FFFFFF' : '#1F2937',
                    padding: '10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 6px 0',
                      fontWeight: 600,
                    }}
                  >
                    Pick Range: {label}
                  </p>
                  <p style={{ margin: 0, color: '#00A86B' }}>
                    {bin.count} drafts ({bin.percentage}%)
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Bar dataKey="count" {...getBarChartProps()} name="Draft Count" />
      </BarChart>
    </ResponsiveContainer>
  );
}
