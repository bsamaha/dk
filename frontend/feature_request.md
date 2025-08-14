## Tools Tab Feature Request — Odds Calculator (MVP) and Extensible Tools Hub

### Summary
- **Goal**: Add a new top‑level "Tools" tab (next to Overview, Players, Analytics, Combinations, About) that hosts multiple utilities. First tool: an **Odds Calculator** that converts American/Fractional/Decimal odds to implied probability and explains positive vs negative expected value (EV).
- **Approach**: Stay aligned with the current architecture (Zustand‑driven view switching, Mantine UI). Implement a new `tools` view with internal tabs for multiple tools, mirroring how `AnalyticsView` uses `Tabs` for sub‑sections.
- **Outcome**: Ship an MVP Odds Calculator quickly; keep the structure extensible for additional tools (e.g., Kelly Criterion, EV calculators, parlay calculators) without major refactors. Optionally consider React Router later for deep‑linking.

### Motivation & User Value
- **Education**: Teach users how implied probability relates to EV; help them identify positive EV opportunities.
- **Utility**: One place to house multiple betting/math tools that complement Analytics and Combinations.
- **Extensibility**: A scalable pattern for more tools without disrupting existing flows.

### Current Frontend Architecture (Relevant Bits)
- **Stateful view switching**: `Header` sets `currentView` via Zustand; `MainContent` renders a view via a switch statement. No React Router.
  - `currentView`: `'overview' | 'players' | 'combinations' | 'analytics' | 'about'` (see `src/types/index.ts`, `src/store/appStore.ts`).
- **Sub‑tabs within a view**: `AnalyticsView` uses Mantine `Tabs` to host multiple analytics panels without URL routing.
- **UI stack**: React + TypeScript, Mantine + Tailwind, TanStack Query, Zustand.

### Proposed Design
- **Add a new top‑level view**: `tools`.
  - Update type unions and switch logic to include `'tools'`.
  - Add a new nav item in `Header` labeled "Tools".
- **Create `ToolsView`**: A Mantine `Tabs` container for multiple tools, with the first tab being the Odds Calculator. Use `keepMounted={false}` like `AnalyticsView` to control mounting.
- **Odds Calculator (MVP)**
  - Inputs:
    - Odds format: American | Decimal | Fractional
    - Odds value: e.g., `-150`, `2.50`, `5/2`
    - Optional: Stake (default 1 unit)
    - Optional: Your estimated true probability (0–100%) to classify Positive/Negative EV
  - Outputs:
    - Implied probability (%) and break‑even probability
    - EV per 1 unit staked and ROI
    - Clear explanation of why a bet is positive or negative EV relative to user’s estimate
  - UX: Live calculation on input change; validation and friendly error messages.
- **File placement**
  - `src/components/layout/ToolsView.tsx` (mirrors other views)
  - `src/components/tools/OddsCalculatorTab.tsx`
  - `src/utils/odds.ts` (pure functions and parsing)

### Formulas & Logic
- **Implied Probability**
  - American odds `o`:
    - If `o > 0`: `p = 100 / (o + 100)`
    - If `o < 0`: `p = (-o) / ((-o) + 100)`
  - Decimal odds `d`: `p = 1 / d`
  - Fractional odds `a/b`: `p = b / (a + b)`
- **Expected Value (per 1 unit stake)**
  - Let `d` be decimal odds, `p_true` user’s estimated true win probability.
  - Net profit on win: `d - 1`. Net loss on loss: `1`.
  - `EV = p_true * (d - 1) - (1 - p_true) * 1`
  - **Positive EV** if `p_true > 1/d` (i.e., true probability exceeds break‑even probability)
  - ROI per bet: `EV / 1` (since stake = 1)

### Minimal Code Changes (No Major Refactor)
- **Types** (`src/types/index.ts`)
  - Extend `AppState['currentView']` to include `'tools'`.

```ts
export interface AppState {
  selectedPlayers: string[];
  currentView: 'overview' | 'players' | 'combinations' | 'analytics' | 'about' | 'tools';
  filters: PlayerFilter;
}
```

- **Header nav** (`src/components/layout/Header.tsx`)
  - Add `{ id: 'tools', label: 'Tools', icon: '🧰' }` to `navItems`.

- **MainContent switch** (`src/components/layout/MainContent.tsx`)
  - Add `'tools'` to prop union and a `case 'tools': return <ToolsView />`.

- **New files**
  - `src/components/layout/ToolsView.tsx`: Mantine `Tabs` with first tab `OddsCalculator`.
  - `src/components/tools/OddsCalculatorTab.tsx`: The calculator UI and logic.
  - `src/utils/odds.ts`: Conversion and EV helpers (unit‑tested).

### Skeletons (illustrative)
```tsx
// src/components/layout/ToolsView.tsx
import { Tabs } from '@mantine/core';
import OddsCalculatorTab from '../tools/OddsCalculatorTab';

const ToolsView = () => (
  <Tabs defaultValue="odds" keepMounted={false}>
    <Tabs.List>
      <Tabs.Tab value="odds">Odds Calculator</Tabs.Tab>
      {/* Future: <Tabs.Tab value="kelly">Kelly Criterion</Tabs.Tab> */}
    </Tabs.List>
    <Tabs.Panel value="odds" pt="sm">
      <OddsCalculatorTab />
    </Tabs.Panel>
  </Tabs>
);

export default ToolsView;
```

```tsx
// src/components/tools/OddsCalculatorTab.tsx
import { useMemo, useState } from 'react';
import { Select, NumberInput, Paper, Title, Text, Group } from '@mantine/core';
import { toDecimalOdds, toImpliedProbability, expectedValuePerUnit } from '../../utils/odds';

const OddsCalculatorTab = () => {
  const [format, setFormat] = useState<'american' | 'decimal' | 'fractional'>('american');
  const [odds, setOdds] = useState<string>('-110'); // string to support fractional input like "5/2"
  const [stake, setStake] = useState<number>(1);
  const [pTrue, setPTrue] = useState<number | undefined>(undefined); // 0..100

  const { impliedPct, breakevenPct, ev, roi, error } = useMemo(() => {
    try {
      const d = toDecimalOdds(odds, format);
      const implied = toImpliedProbability({ decimal: d });
      const p = pTrue != null ? pTrue / 100 : undefined;
      const evVal = p != null ? expectedValuePerUnit(d, p, stake) : undefined;
      const roiVal = evVal != null ? evVal / stake : undefined;
      return {
        impliedPct: implied * 100,
        breakevenPct: (1 / d) * 100,
        ev: evVal,
        roi: roiVal,
        error: undefined,
      };
    } catch (e) {
      return { impliedPct: undefined, breakevenPct: undefined, ev: undefined, roi: undefined, error: (e as Error).message };
    }
  }, [odds, format, pTrue, stake]);

  return (
    <Paper withBorder p="lg" radius="md">
      <Title order={3}>Odds Calculator</Title>
      <Group mt="md" grow>
        <Select data={[{value:'american',label:'American'}, {value:'decimal',label:'Decimal'}, {value:'fractional',label:'Fractional'}]}
                value={format} onChange={v => setFormat(v as any)} label="Format"/>
        <NumberInput label="Stake" value={stake} onChange={v => setStake(Number(v) || 0)} min={0} />
      </Group>
      {/* Odds input uses a text field to allow fractional like 5/2 */}
      {/* Show implied probability, break-even, EV, ROI; classify Positive/Negative EV when pTrue provided */}
      {error && <Text c="red">{error}</Text>}
      {/* ... */}
    </Paper>
  );
};

export default OddsCalculatorTab;
```

```ts
// src/utils/odds.ts
export function toDecimalOdds(input: string | number, format: 'american' | 'decimal' | 'fractional'): number {
  const val = typeof input === 'number' ? String(input) : input.trim();
  if (format === 'decimal') {
    const d = Number(val);
    if (!isFinite(d) || d <= 1) throw new Error('Decimal odds must be > 1');
    return d;
  }
  if (format === 'american') {
    const a = Number(val);
    if (!Number.isInteger(a) || a === 0) throw new Error('American odds must be non-zero integer');
    return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  }
  // fractional
  const [numStr, denStr] = val.split('/');
  const num = Number(numStr), den = Number(denStr);
  if (!isFinite(num) || !isFinite(den) || den <= 0) throw new Error('Fractional odds must be a/b with b>0');
  return 1 + num / den;
}

export function toImpliedProbability(params: { decimal: number }): number {
  return 1 / params.decimal;
}

export function expectedValuePerUnit(decimalOdds: number, pTrue: number, stake = 1): number {
  // EV = p * (payout) - (1-p) * stake; payout (net) = (decimal - 1) * stake
  const netIfWin = (decimalOdds - 1) * stake;
  const netIfLose = stake;
  return pTrue * netIfWin - (1 - pTrue) * netIfLose;
}
```

### Analytics & Instrumentation
- Track events when users calculate or change formats (e.g., `tools_odds_calculate`, `tools_odds_format_change`).
- Include anonymized fields: format, magnitude buckets (avoid raw odds for privacy if desired).

### Validation & UX
- Strict parsing for each format; show inline errors.
- Guard against invalid decimal odds (`<= 1`), invalid fractional (`b > 0`), and American `0`.
- Provide examples/placeholders (`-110`, `2.50`, `5/2`).
- Explain Positive/Negative EV when user enters an estimated probability.

### Testing Plan
- **Unit**: `utils/odds.ts` conversions and EV across representative cases.
- **Component**: Render `ToolsView` and `OddsCalculatorTab`, validate inputs update outputs; accessibility checks via `vitest-axe`.
- **Header**: Update Header test to assert "Tools" button is present and sets `currentView` to `tools` on click.

### Accessibility
- Ensure form controls have labels; announce calculation results; maintain high contrast in dark/light modes.

### Performance
- All client‑side, no network calls; minimal overhead. Use `keepMounted={false}` for tab panels to limit memory when switched.

### Alternatives (and When to Consider Them)
- **Adopt React Router now**
  - Pros: Deep links for `/tools/odds`, browser history, direct shares.
  - Cons: Requires refactoring navigation to route‑based, touching `Header`, `MainContent`, tests; heavier lift.
  - Consider if we need sharable URLs for sub‑tools soon.
- **Nested dynamic nav system**
  - Pros: Metadata‑driven nav; less hard‑coded.
  - Cons: Adds complexity without immediate value given current scale.

### Open Questions
- Do we want deep‑linkable URLs for sub‑tools in the near term?
- Which additional tools are next (Kelly Criterion, Parlay EV, No‑Vig conversion, Hold calculator)?
- Should we surface educational content inline or via a guided walkthrough?

### Acceptance Criteria (MVP)
- A new "Tools" button appears in the header and switches to a Tools view.
- Tools view contains a tabbed interface with an "Odds Calculator" tab.
- Users can enter odds in American/Decimal/Fractional; see implied probability and break‑even probability.
- If an estimated true probability is provided, the UI classifies and explains Positive vs Negative EV and shows EV/ROI.
- Basic unit tests for odds conversions and a header test for the new nav item pass.

### Effort Estimate
- Types and nav updates: 0.5 day
- ToolsView + OddsCalculatorTab UI/logic: 1.0–1.5 days
- Utils + tests + a11y polish: 0.5–1.0 day
- Total MVP: ~2–3 days

### Risks & Mitigations
- **Input parsing edge cases**: Add strict validation and tests.
- **Scope creep (many tools)**: Start with a single tab; keep API surface minimal and documented.
- **Future deep‑linking need**: Design `ToolsView` to be easily migrated to a router (component split, pure utils).
