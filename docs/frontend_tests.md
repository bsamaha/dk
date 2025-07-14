# Frontend Test Suite Documentation

*Date: 2024-07-16*
*Scope: Overview of unit and integration tests for the React frontend.*

## Overview
Tests use Vitest and React Testing Library, focusing on components, hooks, store, and services. Coverage is now ~50% after expansions. Organized in __tests__ folders.

## Running Tests
From `frontend/`:
```bash
pnpm test --coverage
```

## Unit Tests
- **OverviewView.spec.tsx**: Loading, stats rendering.
- **PlayersView.spec.tsx**: Table, search handling.
- **DraftSlotTab.spec.tsx**: Controls, table/chart.
- **appStore.spec.ts**: State updates.
- **api.spec.ts**: Fetch methods.

## Coverage
~50%; high in key views. Add more for edge cases.

Improvements: E2E with Playwright, increase to 70%+. 