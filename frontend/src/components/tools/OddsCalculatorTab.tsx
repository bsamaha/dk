import { useMemo, useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  NumberInput,
  Select,
  TextInput,
  Badge,
  Tooltip,
  Divider,
  Slider,
} from '@mantine/core';
import {
  expectedValuePerUnit,
  isPositiveEv,
  toDecimalOdds,
  toImpliedProbabilityFromDecimal,
  probabilityToDecimal,
  decimalToAmerican,
  decimalToFractional,
  formatAmerican,
  type OddsFormat,
} from '../../utils/odds';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

const OddsCalculatorTab = () => {
  const [format, setFormat] = useState<OddsFormat>('american');
  const [odds, setOdds] = useState<string>('-110');
  const [stake, setStake] = useState<number>(100);
  const [pTruePct, setPTruePct] = useState<number>(50);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const result = useMemo(() => {
    try {
      const d = toDecimalOdds(odds, format);
      const implied = toImpliedProbabilityFromDecimal(d);
      const breakevenPct = (1 / d) * 100;
      const impliedPct = implied * 100;
      const pTrue = pTruePct / 100;
      const ev = expectedValuePerUnit(d, pTrue, stake);
      const roi = (ev / stake) * 100;
      const positive = isPositiveEv(d, pTrue);
      return { d, impliedPct, breakevenPct, ev, roi, positive, error: undefined };
    } catch (e) {
      return { d: undefined, impliedPct: undefined, breakevenPct: undefined, ev: undefined, roi: undefined, positive: undefined, error: (e as Error).message };
    }
  }, [odds, format, pTruePct, stake]);

  const evCurveData = useMemo(() => {
    // Build EV curve from 0%..100% in 5% increments for the given odds/stake
    try {
      const d = toDecimalOdds(odds, format);
      const points = Array.from({ length: 21 }, (_, i) => i * 5).map(p => {
        const pTrue = p / 100;
        const ev = expectedValuePerUnit(d, pTrue, stake);
        return { p, ev, evPos: Math.max(ev, 0), evNeg: Math.min(ev, 0) };
      });
      return points;
    } catch {
      return [];
    }
  }, [odds, format, stake]);

  // Derived fair odds from user's probability (if provided)
  const fair = useMemo(() => {
    if (pTruePct <= 0 || pTruePct >= 100) return undefined;
    try {
      const p = pTruePct / 100;
      const d = probabilityToDecimal(p);
      return {
        decimal: d,
        american: decimalToAmerican(d),
        fractional: decimalToFractional(d),
      };
    } catch {
      return undefined;
    }
  }, [pTruePct]);

  return (
    <Paper withBorder p="lg" radius="md" className="bg-white dark:bg-surface-dark-elev">
      <Title order={3} className="font-heading">Odds Calculator</Title>
      <Text c="dimmed" mt="xs">Convert odds to implied probability and evaluate positive vs negative EV.</Text>

      {/* Inputs grouped by source: Sportsbook vs Your Model */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <Title order={5} className="mb-2">Sportsbook Odds</Title>
          <Group grow align="end">
            <Select
              label={
                <Group gap="xs">
                  <Text>Odds Format</Text>
                  <Tooltip label="Choose the format the sportsbook quotes (American, Decimal, Fractional)"><span>ⓘ</span></Tooltip>
                </Group>
              }
              value={format}
              onChange={v => setFormat(v as OddsFormat)}
              data={[
                { value: 'american', label: 'American' },
                { value: 'decimal', label: 'Decimal' },
                { value: 'fractional', label: 'Fractional' },
              ]}
            />
            <TextInput
              label={
                <Group gap="xs">
                  <Text>Odds</Text>
                  <Tooltip label="The line offered by the book. Example: -110 (American), 2.50 (Decimal), 5/2 (Fractional)"><span>ⓘ</span></Tooltip>
                </Group>
              }
              value={odds}
              onChange={e => setOdds(e.currentTarget.value)}
              placeholder={format === 'fractional' ? 'e.g., 5/2' : format === 'decimal' ? 'e.g., 2.50' : 'e.g., -110'}
            />
            <NumberInput label={
              <Group gap="xs">
                <Text>Stake</Text>
                <Tooltip label="Amount you plan to wager (in units). EV/ROI will scale with stake."><span>ⓘ</span></Tooltip>
              </Group>
            } value={stake} onChange={v => setStake(Number(v) || 0)} min={0} />
          </Group>
        </div>
        <div className="space-y-4">
          <Title order={5} className="mb-3">Your Model</Title>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Text>Your True Probability (%)</Text>
              <Tooltip label="Your estimated chance of the bet winning, based on your own model or research."><span>ⓘ</span></Tooltip>
              <Badge variant="light">{pTruePct}%</Badge>
            </div>
            <Slider
              value={pTruePct}
              onChange={setPTruePct}
              min={0}
              max={100}
              step={1}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 75, label: '75%' },
                { value: 100, label: '100%' },
              ]}
              label={value => `${value}%`}
            />
          </div>
          {fair && (
            <Group mt="md" gap="md">
              <Badge variant="outline">Fair (Decimal): {fair.decimal.toFixed(2)}</Badge>
              <Badge variant="outline">Fair (American): {formatAmerican(fair.american)}</Badge>
              <Badge variant="outline">Fair (Fractional): {fair.fractional}</Badge>
            </Group>
          )}
        </div>
      </div>
      <Divider my="lg" />

      <Group mt="xl">
        {result.error ? (
          <Text c="red">{result.error}</Text>
        ) : (
          <>
            {result.impliedPct != null && (
              <Badge color="brand" variant="light" size="lg">
                Implied Probability: {result.impliedPct.toFixed(2)}%
              </Badge>
            )}
            {result.breakevenPct != null && (
              <Badge color="gold" variant="light" size="lg">
                Break-even: {result.breakevenPct.toFixed(2)}%
              </Badge>
            )}
            {result.ev != null && (
              <Badge color={result.positive ? 'green' : 'red'} variant="filled" size="lg">
                {result.positive ? 'Positive EV' : 'Negative EV'} — EV: {result.ev.toFixed(2)} ({result.roi?.toFixed(2)}%)
              </Badge>
            )}
          </>
        )}
      </Group>

      <div className="mt-10">
        <Title order={5} className="mb-2">EV vs True Probability</Title>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evCurveData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="evAreaPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A86B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00A86B" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="evAreaNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="p" tickFormatter={v => `${v}%`} />
              <YAxis tickFormatter={v => `$${v}`} />
              <RechartsTooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'EV']} labelFormatter={l => `True Probability: ${l}%`} />
              <ReferenceLine y={0} stroke={isDark ? '#9CA3AF' : '#9CA3AF'} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="evNeg" stroke="#DC2626" fillOpacity={1} fill="url(#evAreaNeg)" isAnimationActive={false} />
              <Area type="monotone" dataKey="evPos" stroke="#00A86B" fillOpacity={1} fill="url(#evAreaPos)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <Text c="dimmed" size="sm" mt="xs">
          EV per stake unit across true probability assumptions. Positive EV region lies to the right of the break-even probability.
        </Text>
      </div>
    </Paper>
  );
};

export default OddsCalculatorTab;
