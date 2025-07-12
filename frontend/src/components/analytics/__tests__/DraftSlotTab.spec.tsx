import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DraftSlotTab from '../DraftSlotTab';

// Mock the hook to return deterministic data
vi.mock('../../../hooks/useDraftSlotCorrelation', () => {
  return {
    useDraftSlotCorrelation: () => ({
      data: {
        slot: 1,
        metric: 'percent',
        rows: [
          {
            player: 'Player A',
            slot: 10,
            overall: 100,
            p_slot: 0.1,
            p_overall: 0.01,
            score: 10,
          },
        ],
      },
      isLoading: false,
      error: null,
    }),
  };
});

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('DraftSlotTab', () => {
  it('renders chart and table once data is loaded', () => {
    renderWithClient(<DraftSlotTab />);

    // Expect player row to appear
    expect(screen.getByText('Player A')).toBeInTheDocument();

    // Expect tooltip label labels exist (YAxis category)
    expect(screen.getByText('Player A')).toBeTruthy();

    // Table headers
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Slot Cnt')).toBeInTheDocument();
  });
});
