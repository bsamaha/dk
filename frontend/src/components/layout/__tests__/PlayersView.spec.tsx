import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import PlayersView from '../../layout/PlayersView';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PlayersResponse } from '../../../types';

vi.mock('@tanstack/react-query');

describe('PlayersView - single input selection', () => {
  it('renders single Select (not MultiSelect) for player search', async () => {
    const mockData: PlayersResponse = {
      players: [],
      total_count: 0,
      page_info: {
        total_count: 0,
        limit: 10,
        offset: 0,
        has_next: false,
        has_previous: false,
        current_page: 1,
        total_pages: 1,
      },
    };
    const mockResult: Partial<UseQueryResult<PlayersResponse, Error>> = {
      data: mockData,
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
    };
    (useQuery as unknown as vi.Mock).mockImplementation(() => mockResult);

    await act(async () => {
      render(
        <MantineProvider>
          <PlayersView />
        </MantineProvider>
      );
    });

    // Ensure Mantine Select input is present with brand-input class applied
    const input = screen.getByPlaceholderText(/search and select a player/i);
    expect(input).toBeInTheDocument();
    expect(input.closest('.brand-input')).not.toBeNull();
    // No selection yet, so it should not have selected class
    expect(input.closest('.brand-input-selected')).toBeNull();
    // Ensure no chips/pills are rendered for selection (MultiSelect would render pills area)
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
