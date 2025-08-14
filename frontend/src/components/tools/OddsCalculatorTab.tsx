import { useMemo, useState, useEffect } from 'react';
import {
  Title,
  Text,
  Group,
  NumberInput,

  SegmentedControl,
  Badge,
  Tooltip,
  Slider,
  ActionIcon,
  Button,
  Switch,
  Collapse,
  Stack,
  Card,
  useMantineTheme,
  TextInput,
} from '@mantine/core';
import StatCard from '../common/StatCard';
import { useDisclosure, useClipboard } from '@mantine/hooks';
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
import { getTooltipStyle, getGridStroke, CHART_COLORS } from '../../utils/chartTheme';
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
import {
  IconCopy,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconShare,
  IconInfoCircle,
  IconChevronDown
} from '@tabler/icons-react';

// Odds control configuration
// Expanded range to cover very long shots up to +10000 American (≈101.00 decimal)
const ODDS_DECIMAL_MIN = 1.01;
const ODDS_DECIMAL_MAX = 101.0;
const ODDS_DECIMAL_STEP = 0.01;
// American slider scale for better balance around even odds
const AMERICAN_SLIDER_MIN = -2000;
const AMERICAN_SLIDER_MAX = 2000;
const AMERICAN_TICK_COUNT = 9; // evenly spread major ticks
const DECIMAL_TICK_COUNT = 9; // evenly spread for decimal/fractional

const OddsCalculatorTab = () => {
  useMantineTheme();
  const [format, setFormat] = useState<OddsFormat>('american');
  const [oddsDecimal, setOddsDecimal] = useState<number>(() => {
    try {
      return toDecimalOdds('-110', 'american');
    } catch {
      return 2.0;
    }
  });
  const [stake, setStake] = useState<number>(100);
  const [pTruePct, setPTruePct] = useState<number>(50);
  const [perUnit, setPerUnit] = useState<boolean>(false);
  const [educationOpened, { toggle: toggleEducation }] = useDisclosure(false);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const SIGNAL = CHART_COLORS.primary;
  const GOLD = CHART_COLORS.secondary;
  const GRAPHITE = CHART_COLORS.quaternary;
  const NEGATIVE = '#EF4444';
  const NEGATIVE_DARK = '#DC2626';

  const evClipboard = useClipboard({ timeout: 2000 });
  const fairOddsClipboard = useClipboard({ timeout: 2000 });
  const shareClipboard = useClipboard({ timeout: 2000 });

  const result = useMemo(() => {
    try {
      const d = oddsDecimal;
      const implied = toImpliedProbabilityFromDecimal(d);
      const breakevenPct = (1 / d) * 100;
      const impliedPct = implied * 100;
      const pTrue = pTruePct / 100;
      const effectiveStake = perUnit ? 1 : stake;
      const ev = expectedValuePerUnit(d, pTrue, effectiveStake);
      const roi = (ev / effectiveStake) * 100;
      const positive = isPositiveEv(d, pTrue);
      return { d, impliedPct, breakevenPct, ev, roi, positive, error: undefined };
    } catch (e) {
      return { d: undefined, impliedPct: undefined, breakevenPct: undefined, ev: undefined, roi: undefined, positive: undefined, error: (e as Error).message };
    }
  }, [oddsDecimal, pTruePct, stake, perUnit]);

  const evCurveData = useMemo(() => {
    // Build EV curve from 0%..100% in 5% increments for the given odds/stake
    try {
      const d = oddsDecimal;
      const effectiveStake = perUnit ? 1 : stake;
      const points = Array.from({ length: 21 }, (_, i) => i * 5).map(p => {
        const pTrue = p / 100;
        const ev = expectedValuePerUnit(d, pTrue, effectiveStake);
        return { p, ev, evPos: Math.max(ev, 0), evNeg: Math.min(ev, 0) };
      });
      return points;
    } catch {
      return [];
    }
  }, [oddsDecimal, stake, perUnit]);

  // Keep human-readable odds string in sync with decimal + format
  const formatOddsFromDecimal = (d: number, fmt: OddsFormat): string => {
    if (fmt === 'decimal') return d.toFixed(2);
    if (fmt === 'american') return formatAmerican(decimalToAmerican(d));
    return decimalToFractional(d);
  };

  // When slider or format changes, update the displayed odds string
  // Odds decimal is the source of truth
  const displayedOdds = useMemo(() => formatOddsFromDecimal(oddsDecimal, format), [oddsDecimal, format]);
  // Input field state (editable)
  const [oddsInput, setOddsInput] = useState<string>(displayedOdds);
  // Keep input synchronized with computed display value without updating during render
  useEffect(() => {
    setOddsInput(displayedOdds);
  }, [displayedOdds]);

  const commitOddsInput = () => {
    try {
      const d = toDecimalOdds(oddsInput, format);
      const clamped = Math.min(Math.max(d, ODDS_DECIMAL_MIN), ODDS_DECIMAL_MAX);
      setOddsDecimal(clamped);
    } catch {
      // ignore invalid input; field will snap back on next render
      setOddsInput(displayedOdds);
    }
  };

  // Slider mapping (american scale for balance)
  const americanFromDecimal = (d: number): number => {
    const a = decimalToAmerican(d);
    if (a === 0) return 0;
    return Math.max(AMERICAN_SLIDER_MIN, Math.min(AMERICAN_SLIDER_MAX, a));
  };
  const decimalFromAmerican = (a: number): number => {
    if (a === 0) return 2.0;
    return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  };
  const americanSliderValue = useMemo(() => americanFromDecimal(oddsDecimal), [oddsDecimal]);

  const buildAmericanMarks = (min: number, max: number) => {
    const rawStep = (max - min) / (AMERICAN_TICK_COUNT - 1);
    // Snap steps to nice 50 increments for readability
    const step = Math.max(1, Math.round(rawStep / 50) * 50);
    const values = Array.from({ length: AMERICAN_TICK_COUNT }, (_, i) => {
      let v = min + i * step;
      if (i === 0) v = min;
      if (i === AMERICAN_TICK_COUNT - 1) v = max;
      return Math.round(v);
    });
    return values.map(v => ({ value: v, label: v === 0 ? 'EVEN' : v > 0 ? `+${v}` : `${v}` }));
  };

  const decimalMarks = useMemo(() => {
    const min = ODDS_DECIMAL_MIN;
    const max = ODDS_DECIMAL_MAX;
    const step = (max - min) / (DECIMAL_TICK_COUNT - 1);
    return Array.from({ length: DECIMAL_TICK_COUNT }, (_, i) => {
      let v = min + i * step;
      if (i === 0) v = min;
      if (i === DECIMAL_TICK_COUNT - 1) v = max;
      const rounded = Math.round(v * 100) / 100;
      const label = format === 'fractional' ? decimalToFractional(rounded) : rounded.toFixed(2);
      return { value: rounded, label };
    });
  }, [format]);

  // Custom tooltip: show only the non-zero EV (either positive or negative)
  type RechartsPayload = { value: number };
  const EVTooltip = ({ active, payload, label }: { active?: boolean; payload?: RechartsPayload[]; label?: number | string }) => {
    if (!active || !payload || payload.length === 0) return null;
    const epsilon = 1e-9;
    const nonZero = payload.find(p => Math.abs(Number(p.value) || 0) > epsilon) || payload[0];
    const value = Number((nonZero as RechartsPayload).value || 0);
    const color = value >= 0 ? SIGNAL : NEGATIVE_DARK;
    return (
      <div style={{
        ...getTooltipStyle(isDark),
        padding: '8px 10px',
        borderRadius: 6,
      }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>True Probability: {label}%</div>
        <div style={{ fontWeight: 600, color }}>EV: ${value.toFixed(2)}</div>
      </div>
    );
  };

  // Helper functions
  const adjustOdds = (direction: 'up' | 'down') => {
    if (format === 'decimal') {
      const step = ODDS_DECIMAL_STEP;
      const newDecimal = direction === 'up'
        ? Math.min(oddsDecimal + step, ODDS_DECIMAL_MAX)
        : Math.max(oddsDecimal - step, ODDS_DECIMAL_MIN);
      setOddsDecimal(newDecimal);
    } else {
      const delta = direction === 'up' ? 1 : -1;
      const currentA = americanFromDecimal(oddsDecimal);
      const nextA = Math.max(AMERICAN_SLIDER_MIN, Math.min(AMERICAN_SLIDER_MAX, currentA + delta));
      setOddsDecimal(decimalFromAmerican(nextA));
    }
  };

  const resetForm = () => {
    setFormat('american');
    setOddsDecimal(toDecimalOdds('-110', 'american'));
    setStake(100);
    setPTruePct(50);
    setPerUnit(false);
  };

  const shareState = () => {
    const state = {
      format,
      odds: oddsDecimal,
      stake,
      probability: pTruePct,
      perUnit
    };
    const url = `${window.location.origin}${window.location.pathname}#odds=${encodeURIComponent(JSON.stringify(state))}`;
    shareClipboard.copy(url);
  };

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
    <div className="space-y-6">
      {/* Header with Title and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title order={2} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>Odds Calculator</Title>
          <Text size="md" mt={6} fw={400} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
            Read the coverage. Call the win.
          </Text>
          <Text size="sm" mt={2} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
            Convert odds, set your true probability, see EV.
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="light"
            size="sm"
            color="signal"
            leftSection={<IconRefresh size={16} />}
            onClick={resetForm}
          >
            Reset
          </Button>
          <Button
            variant="filled"
            size="sm"
            color={shareClipboard.copied ? 'signal' : 'gold'}
            leftSection={<IconShare size={16} />}
            onClick={shareState}
            style={{ border: 'none', color: shareClipboard.copied ? undefined : GRAPHITE }}
          >
            {shareClipboard.copied ? 'Copied!' : 'Share'}
          </Button>
        </Group>
      </div>

      {/* Summary Strip */}
      {!result.error && (
        <Card withBorder p="md" radius="md" style={{
          borderColor: `${SIGNAL}20`,
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Implied Probability" value={`${result.impliedPct?.toFixed(1)}%`} />
            <StatCard label="Break-even" value={`${result.breakevenPct?.toFixed(1)}%`} />
            <StatCard
              label="Your EV"
              value={`$${result.ev?.toFixed(2)} (${result.roi?.toFixed(1)}% ROI)`}
              highlight={result.positive ? 'signal' : 'negative'}
              copyAction={
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={() => evClipboard.copy(`EV: $${result.ev?.toFixed(2)} (${result.roi?.toFixed(2)}%)`)}
                  color={evClipboard.copied ? 'green' : 'gray'}
                >
                  <IconCopy size={14} />
                </ActionIcon>
              }
            />
            <StatCard
              label="Fair Odds"
              value={fair ? `${formatOddsFromDecimal(fair.decimal, format)}` : '-'}
              highlight="gold"
              copyAction={fair ? (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={() => fairOddsClipboard.copy(`Fair: ${formatOddsFromDecimal(fair.decimal, format)}`)}
                  color={fairOddsClipboard.copied ? 'green' : 'gray'}
                >
                  <IconCopy size={14} />
                </ActionIcon>
              ) : undefined}
            />
          </div>

          {/* EV Explanation */}
          {result.ev != null && (
            <Text size="xs" c="dimmed" mt="md" ta="center">
              Your {pTruePct}% {result.positive ? '>' : '<'} {result.breakevenPct?.toFixed(1)}% break-even → {result.positive ? 'positive' : 'negative'} EV
            </Text>
          )}
        </Card>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Inputs (30-40%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sportsbook Odds Card */}
          <Card withBorder p="xl" radius="md" style={{ borderColor: `${SIGNAL}20`, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }}>
            <Title order={4} mb="xl" style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
              Sportsbook Odds
            </Title>

            <Stack gap="lg">
              <div>
                <Group gap="xs" mb="xs">
                  <Text size="sm" fw={500} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>Odds Format</Text>
                  <Tooltip label="Choose how the sportsbook quotes odds">
                    <ActionIcon variant="subtle" size="xs">
                      <IconInfoCircle size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <SegmentedControl
                  value={format}
                  onChange={(v) => setFormat(v as OddsFormat)}
                  data={[
                    { value: 'american', label: 'American' },
                    { value: 'decimal', label: 'Decimal' },
                    { value: 'fractional', label: 'Fractional' },
                  ]}
                />
              </div>

              <div>
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <Text size="sm" fw={500} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>Odds</Text>
                    <Tooltip label="The line offered by the sportsbook">
                      <ActionIcon variant="subtle" size="xs">
                        <IconInfoCircle size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => adjustOdds('down')}
                      disabled={oddsDecimal <= ODDS_DECIMAL_MIN}
                    >
                      <IconMinus size={14} />
                    </ActionIcon>
                    <TextInput
                      value={oddsInput}
                      onChange={(e) => setOddsInput(e.currentTarget.value)}
                      onBlur={commitOddsInput}
                      onKeyDown={(e) => { if (e.key === 'Enter') { commitOddsInput(); } }}
                      size="sm"
                      styles={{ input: { width: 120, textAlign: 'center' } }}
                    />
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => adjustOdds('up')}
                      disabled={format === 'decimal' ? oddsDecimal >= ODDS_DECIMAL_MAX : americanFromDecimal(oddsDecimal) >= AMERICAN_SLIDER_MAX}
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Group>
                </Group>

                {format === 'american' ? (
                  <Slider
                    value={americanSliderValue}
                    onChange={(val) => setOddsDecimal(decimalFromAmerican(Number(val)))}
                    min={AMERICAN_SLIDER_MIN}
                    max={AMERICAN_SLIDER_MAX}
                    step={1}
                    marks={buildAmericanMarks(AMERICAN_SLIDER_MIN, AMERICAN_SLIDER_MAX)}
                    label={(val) => (Number(val) > 0 ? `+${val}` : `${val}`)}
                  />
                ) : (
                  <Slider
                    value={oddsDecimal}
                    onChange={setOddsDecimal}
                    min={ODDS_DECIMAL_MIN}
                    max={ODDS_DECIMAL_MAX}
                    step={ODDS_DECIMAL_STEP}
                    marks={decimalMarks}
                    label={(value) => format === 'fractional' ? decimalToFractional(value) : value.toFixed(2)}
                  />
                )}
              </div>

              <div>
                <Group gap="xs" mb="xs">
                  <Text size="sm" fw={500} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>Stake</Text>
                  <Tooltip label="Amount you plan to wager">
                    <ActionIcon variant="subtle" size="xs">
                      <IconInfoCircle size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Group>
                  <NumberInput
                    value={stake}
                    onChange={v => setStake(Number(v) || 0)}
                    min={0}
                    leftSection="$"
                    style={{ flex: 1 }}
                    styles={{ input: { textAlign: 'right' } }}
                  />
                  <Switch
                    label="Per $1"
                    checked={perUnit}
                    onChange={(e) => setPerUnit(e.currentTarget.checked)}
                    size="sm"
                    styles={{ label: { color: isDark ? '#FFFFFF' : GRAPHITE } }}
                  />
                </Group>
              </div>
            </Stack>
          </Card>

          {/* Your Model Card */}
          <Card withBorder p="xl" radius="md" style={{ borderColor: `${GOLD}20`, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }}>
            <Title order={4} mb="xl" style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
              Your Estimated Win Probability
            </Title>

            <div>
              <Group justify="space-between" align="center" mb="xs">
                <Group gap="xs">
                  <Text size="sm" fw={500} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>True Probability</Text>
                  <Tooltip label="Your estimated chance of the bet winning">
                    <ActionIcon variant="subtle" size="xs">
                      <IconInfoCircle size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Badge variant="light" size="lg">
                  {pTruePct}%
                </Badge>
              </Group>

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

            {/* Fair Odds Panel */}
            {fair && (
              <Card withBorder p="md" mt="lg" style={{ borderColor: `${GOLD}20`, backgroundColor: isDark ? '#1E1E1E' : '#FFF7CC' }}>
                <Group justify="space-between" align="center" mb="xs">
                  <Text size="sm" fw={600} style={{ color: GOLD }}>Fair Odds</Text>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => fairOddsClipboard.copy(`Decimal: ${fair.decimal.toFixed(2)}, American: ${formatAmerican(fair.american)}, Fractional: ${fair.fractional}`)}
                    color={fairOddsClipboard.copied ? 'green' : 'blue'}
                  >
                    <IconCopy size={14} />
                  </ActionIcon>
                </Group>
                <Stack gap="xs">
                  <Text size="sm" style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
                    <strong>Decimal:</strong> {fair.decimal.toFixed(2)}
                  </Text>
                  <Text size="sm" style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
                    <strong>American:</strong> {formatAmerican(fair.american)}
                  </Text>
                  <Text size="sm" style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
                    <strong>Fractional:</strong> {fair.fractional}
                  </Text>
                </Stack>
              </Card>
            )}
          </Card>

          {/* Education Section */}
          <Card withBorder p="md" radius="md" style={{ backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderColor: getGridStroke(isDark) }}>
            <Group justify="space-between" align="center" onClick={toggleEducation} style={{ cursor: 'pointer' }}>
              <Text size="sm" fw={600} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>What is implied probability?</Text>
              <ActionIcon variant="subtle" size="sm">
                <IconChevronDown
                  size={16}
                  style={{
                    transform: educationOpened ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </ActionIcon>
            </Group>
            <Collapse in={educationOpened}>
              <Text size="sm" mt="md" style={{ color: isDark ? '#D1D5DB' : '#374151' }}>
                Implied probability is what the sportsbook thinks the chance of an outcome is, based on their odds.
                For example, -110 odds imply a 52.4% chance. If your model thinks the true chance is higher than
                the implied probability, the bet has positive expected value (EV).
              </Text>
            </Collapse>
          </Card>
        </div>

        {/* Right Column - Results (60-70%) */}
        <div className="lg:col-span-3">
          <Card withBorder p="xl" radius="md" style={{ borderColor: `${SIGNAL}20`, backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }}>
            <div className="space-y-8">
              <Title order={4} style={{ color: isDark ? '#FFFFFF' : GRAPHITE }}>
                Expected Value Analysis
              </Title>

              {result.error ? (
                <Text c="red" ta="center" py="xl">
                  {result.error}
                </Text>
              ) : (
                <div className="space-y-4">
                  <div style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evCurveData} margin={{ top: 30, right: 40, left: 40, bottom: 40 }}>
                        <defs>
                          <linearGradient id="evAreaPos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={SIGNAL} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={SIGNAL} stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="evAreaNeg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={NEGATIVE} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={NEGATIVE} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={getGridStroke(isDark)} />
                        <XAxis
                          dataKey="p"
                          tickFormatter={v => `${v}%`}
                          domain={[0, 100]}
                          type="number"
                          scale="linear"
                          label={{ value: 'True Probability (%)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          tickFormatter={v => `$${v}`}
                          label={{ value: 'Expected Value ($)', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip content={<EVTooltip />} />

                        {/* Zero line - make it more prominent */}
                         <ReferenceLine
                          y={0}
                           stroke={isDark ? '#555' : '#e5e7eb'}
                          strokeWidth={3}
                          strokeDasharray="8 4"
                        />

                        {/* Break-even line */}
                        {result.breakevenPct && (
                          <ReferenceLine
                            x={result.breakevenPct}
                            stroke={GOLD}
                            strokeWidth={2}
                            strokeDasharray="6 3"
                            label={{
                              value: "Break-even",
                              position: "top",
                              style: { fill: GOLD, fontWeight: 600, fontSize: 12 }
                            }}
                          />
                        )}

                        {/* User probability line - Always show this line */}
                        <ReferenceLine
                          x={pTruePct}
                          stroke={SIGNAL}
                          strokeWidth={3}
                          label={{
                            value: `Your ${pTruePct}%`,
                            position: "top",
                            style: { fill: SIGNAL, fontWeight: 600, fontSize: 12 }
                          }}
                        />

                        {/* Areas with brand colors */}
                        <Area
                          type="monotone"
                          dataKey="evNeg"
                          stroke={NEGATIVE}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#evAreaNeg)"
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="evPos"
                          stroke={SIGNAL}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#evAreaPos)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                   {/* Custom Legend positioned below chart */}
                   <div className="flex justify-center gap-6 py-3" style={{ borderTop: `1px solid ${getGridStroke(isDark)}` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded" style={{ backgroundColor: SIGNAL }}></div>
                      <Text size="sm" fw={500} style={{ color: SIGNAL }}>Positive EV</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded" style={{ backgroundColor: NEGATIVE }}></div>
                      <Text size="sm" fw={500} style={{ color: NEGATIVE }}>Negative EV</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 border-t-2 border-dashed" style={{ borderColor: GOLD }}></div>
                      <Text size="sm" fw={500} style={{ color: GOLD }}>Break-even</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 border-t-2" style={{ borderColor: SIGNAL }}></div>
                      <Text size="sm" fw={500} style={{ color: SIGNAL }}>Your Estimate</Text>
                    </div>
                  </div>
                </div>
              )}

              <Text c="dimmed" size="sm">
                Expected value per {perUnit ? '$1' : `$${stake}`} stake across different probability assumptions.
                The vertical lines show break-even probability and your estimated probability.
              </Text>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OddsCalculatorTab;
