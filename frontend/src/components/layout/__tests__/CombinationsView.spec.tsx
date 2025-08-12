import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import CombinationsView from '../CombinationsView';
import type { UseQueryResult } from '@tanstack/react-query';
import { fireEvent } from '@testing-library/react';

// Mock Mantine hooks that might cause issues in jsdom
vi.mock('@mantine/hooks', () => ({
  useDebouncedValue: vi.fn((val: unknown) => [val, vi.fn()]),
  useMediaQuery: vi.fn(() => false),
  useLocalStorage: vi.fn(() => [null, vi.fn()]),
  useViewportSize: vi.fn(() => ({ width: 1024, height: 768 })),
}));

vi.mock('@tanstack/react-query');

describe('CombinationsView', () => {
  const mockMetadata = {
    all_players: [
      { name: 'Player A', position: 'QB', team: 'Team' },
      { name: 'Player B', position: 'RB', team: 'Team' },
    ],
    total_players: 2,
    total_drafts: 10,
    total_teams: 12,
  };

  const mockRosterData = [{ QB: 1, RB: 2, WR: 3, TE: 1, count: 10 }];

  const mockCombinationsData = {
    combinations: [
      {
        draft_id: 1,
        draft_position: 1,
        players: ['Player A', 'Player B'],
        position_counts: 'QB: 1, RB: 1',
      },
      {
        draft_id: 2,
        draft_position: 2,
        players: ['Player C', 'Player D'],
        position_counts: 'WR: 2, TE: 1',
      },
    ],
    total_combinations: 2,
    filter_applied: {
      required_players: ['Player A', 'Player B'],
      n_rounds: 20,
      limit: 100,
    },
  };

  beforeEach(() => {
    // Mock matchMedia for responsive components
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock useQuery with stable return values
    vi.mocked(useQuery).mockImplementation(options => {
      const queryKey = Array.isArray(options.queryKey)
        ? options.queryKey[0]
        : options.queryKey;

      if (queryKey === 'metadata') {
        return {
          data: mockMetadata,
          isLoading: false,
          isError: false,
          isFetching: false,
          error: null,
          refetch: vi.fn(),
          isSuccess: true,
        } as unknown as UseQueryResult;
      }

      if (queryKey === 'rosterConstructionCounts') {
        return {
          data: mockRosterData,
          isLoading: false,
          isError: false,
          isFetching: false,
          error: null,
          refetch: vi.fn(),
          isSuccess: true,
        } as unknown as UseQueryResult;
      }

      if (queryKey === 'combinations') {
        return {
          data: mockCombinationsData,
          isLoading: false,
          isError: false,
          isFetching: false,
          error: null,
          refetch: vi.fn(),
          isSuccess: true,
        } as unknown as UseQueryResult;
      }

      return {
        data: undefined,
        isLoading: false,
        isError: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: false,
      } as unknown as UseQueryResult;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state', async () => {
    // Override the default mock to return loading state
    vi.mocked(useQuery).mockImplementation(
      () =>
        ({
          data: undefined,
          isLoading: true,
          isError: false,
          isFetching: true,
          error: null,
          refetch: vi.fn(),
          isSuccess: false,
        }) as unknown as UseQueryResult
    );

    await act(async () => {
      render(
        <MantineProvider>
          <CombinationsView />
        </MantineProvider>
      );
    });

    expect(
      screen.getByText('Searching for combinations...')
    ).toBeInTheDocument();
  });

  it('renders combinations table', async () => {
    await act(async () => {
      render(
        <MantineProvider>
          <CombinationsView />
        </MantineProvider>
      );
    });

    // Check for the segmented control tabs
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /player combinations/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /roster constructions/i })
    ).toBeInTheDocument();

    // Check for the main heading
    expect(
      screen.getByRole('heading', { name: /player combinations/i })
    ).toBeInTheDocument();
  });

  it('allows selecting multiple required players', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <MantineProvider>
          <CombinationsView />
        </MantineProvider>
      );
    });

    const playerTab = screen.getByRole('radio', { name: /player combinations/i });
    if (!playerTab.getAttribute('aria-checked')) {
      await user.click(playerTab);
    }

    const input = screen.getByPlaceholderText(/a\.j\. brown/i);
    // brand-input wrapper should exist for reusable styling
    expect(input.closest('.brand-input')).not.toBeNull();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Player A' } });
    await user.keyboard('{Enter}');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Player B' } });
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: /find teams/i }));

    expect(
      await screen.findByRole('heading', { name: /results \(/i })
    ).toBeInTheDocument();

    // Results should render after selecting multiple players and clicking search
    // Detailed badge styling assertions are unnecessary here.
  });
});
