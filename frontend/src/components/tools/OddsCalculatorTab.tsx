import { useMemo, useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  NumberInput,
  Select,
  TextInput,
  SegmentedControl,
  Badge,
} from '@mantine/core';
import {
  expectedValuePerUnit,
  isPositiveEv,
  toDecimalOdds,
  toImpliedProbabilityFromDecimal,
  type OddsFormat,
} from '../../utils/odds';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

const OddsCalculatorTab = () => {
  const [format, setFormat] = useState<OddsFormat>('american');
  const [odds, setOdds] = useState<string>('-110');
  const [stake, setStake] = useState<number>(100);
  const [pTruePct, setPTruePct] = useState<number | ''>('');
  const [inputMode, setInputMode] = useState<'odds' | 'prob'>('odds');

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const result = useMemo(() => {
    try {
      const d = toDecimalOdds(odds, format);
      const implied = toImpliedProbabilityFromDecimal(d);
      const breakevenPct = (1 / d) * 100;
      const impliedPct = implied * 100;
      const pTrue = pTruePct === '' ? undefined : Number(pTruePct) / 100;
      const ev = pTrue == null ? undefined : expectedValuePerUnit(d, pTrue, stake);
      const roi = ev == null ? undefined : (ev / stake) * 100;
      const positive = pTrue == null ? undefined : isPositiveEv(d, pTrue);
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
        return { p, ev };
      });
      return points;
    } catch {
      return [];
    }
  }, [odds, format, stake]);

  return (
    <Paper withBorder p="lg" radius="md" className="bg-white dark:bg-surface-dark-elev">
      <Title order={3} className="font-heading">Odds Calculator</Title>
      <Text c="dimmed" mt="xs">Convert odds to implied probability and evaluate positive vs negative EV.</Text>

      <Group mt="lg" grow>
        <SegmentedControl
          value={inputMode}
          onChange={v => setInputMode(v as 'odds' | 'prob')}
          data={[{ label: 'Enter Odds', value: 'odds' }, { label: 'Enter Probability', value: 'prob' }]}
        />
      </Group>

      {inputMode === 'odds' && (
        <Group mt="md" grow align="end">
          <Select
            label="Odds Format"
            value={format}
            onChange={v => setFormat(v as OddsFormat)}
            data={[
              { value: 'american', label: 'American' },
              { value: 'decimal', label: 'Decimal' },
              { value: 'fractional', label: 'Fractional' },
            ]}
          />
          <TextInput
            label="Odds"
            value={odds}
            onChange={e => setOdds(e.currentTarget.value)}
            placeholder={format === 'fractional' ? 'e.g., 5/2' : format === 'decimal' ? 'e.g., 2.50' : 'e.g., -110'}
          />
          <NumberInput label="Stake" value={stake} onChange={v => setStake(Number(v) || 0)} min={0} />
          <NumberInput
            label="Your True Probability (%)"
            value={pTruePct}
            onChange={v => setPTruePct(v === '' ? '' : Number(v))}
            min={0}
            max={100}
            clampBehavior="strict"
            placeholder="Optional — classify EV"
          />
        </Group>
      )}

      {inputMode === 'prob' && (
        <Group mt="md" grow align="end">
          <NumberInput
            label="Your True Probability (%)"
            value={pTruePct}
            onChange={v => setPTruePct(v === '' ? '' : Number(v))}
            min={0}
            max={100}
            clampBehavior="strict"
          />
          <Select
            label="Odds Format"
            value={format}
            onChange={v => setFormat(v as OddsFormat)}
            data={[
              { value: 'american', label: 'American' },
              { value: 'decimal', label: 'Decimal' },
              { value: 'fractional', label: 'Fractional' },
            ]}
          />
          <TextInput
            label="Odds"
            value={odds}
            onChange={e => setOdds(e.currentTarget.value)}
            placeholder={format === 'fractional' ? 'e.g., 5/2' : format === 'decimal' ? 'e.g., 2.50' : 'e.g., -110'}
          />
          <NumberInput label="Stake" value={stake} onChange={v => setStake(Number(v) || 0)} min={0} />
        </Group>
      )}

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
                <linearGradient id="evArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? '#00A86B' : '#00A86B'} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={isDark ? '#00A86B' : '#00A86B'} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="p" tickFormatter={v => `${v}%`} />
              <YAxis tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'EV']} labelFormatter={l => `True Probability: ${l}%`} />
              <Area type="monotone" dataKey="ev" stroke="#00A86B" fillOpacity={1} fill="url(#evArea)" />
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
