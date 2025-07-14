import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import DraftSlotTab from '../DraftSlotTab';
import { useDraftSlotCorrelation } from '../../../hooks/useDraftSlotCorrelation';

// Mock the custom hook
vi.mock('../../../hooks/useDraftSlotCorrelation');

const mockData = [
  {
    player: 'Player A',
    position: 'QB',
    slot: 10,
    overall: 100,
    p_slot: 0.5,
    p_overall: 0.3,
    score: 0.8
  }
];

describe('DraftSlotTab', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(useDraftSlotCorrelation).mockReturnValue({
      data: { 
        slot: 10,
        metric: 'percent',
        rows: mockData
      },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useDraftSlotCorrelation>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders controls and table', () => {
    render(
      <MantineProvider>
        <DraftSlotTab />
      </MantineProvider>
    );
    expect(screen.getByText('Draft Slot')).toBeInTheDocument();
    expect(screen.getByText('Player A')).toBeInTheDocument();
  });

  it('updates on control change', () => {
    render(
      <MantineProvider>
        <DraftSlotTab />
      </MantineProvider>
    );
    fireEvent.change(screen.getByLabelText('Draft Slot'), { target: { value: '5' } });
    expect(useDraftSlotCorrelation).toHaveBeenCalledWith({ slot: 5, metric: 'percent', topN: 25 });
  });
}); 