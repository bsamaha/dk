import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import OverviewView from '../../layout/OverviewView';
import type { UseQueryResult } from '@tanstack/react-query';

vi.mock('@tanstack/react-query');

describe('OverviewView', () => {
  beforeEach(() => {
    // Mock ResizeObserver for Recharts
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock matchMedia
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

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock useQuery with proper return values
    vi.mocked(useQuery).mockImplementation(options => {
      const queryKey = Array.isArray(options.queryKey)
        ? options.queryKey[0]
        : options.queryKey;

      if (queryKey === 'metadata') {
        return {
          data: { total_players: 100, total_drafts: 50, total_teams: 12 },
          isLoading: false,
          isError: false,
          error: null,
          isFetching: false,
          refetch: vi.fn(),
          isSuccess: true,
        } as unknown as UseQueryResult;
      }

      if (queryKey === 'positionStats') {
        return {
          data: {
            position_stats: [
              { position: 'QB', total_drafted: 10, median_draft_count: 2 },
            ],
          },
          isLoading: false,
          isError: false,
          error: null,
          isFetching: false,
          refetch: vi.fn(),
          isSuccess: true,
        } as unknown as UseQueryResult;
      }

      if (queryKey === 'roundCounts') {
        return {
          data: { round_counts: [{ round: 1, count: 5 }] },
          isLoading: false,
          isError: false,
          error: null,
          isFetching: false,
          refetch: vi.fn(),
          isSuccess: true,
        } as unknown as UseQueryResult;
      }

      return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
        isSuccess: false,
      } as unknown as UseQueryResult;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      isLoading: true,
      data: undefined,
      isError: false,
      error: null,
      isFetching: true,
      refetch: vi.fn(),
      isSuccess: false,
    } as unknown as UseQueryResult);

    render(
      <MantineProvider>
        <OverviewView />
      </MantineProvider>
    );
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders position stats', () => {
    render(
      <MantineProvider>
        <OverviewView />
      </MantineProvider>
    );
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
