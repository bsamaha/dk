import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import PlayersView from '../../layout/PlayersView';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query');

describe('PlayersView - single input selection', () => {
  it('renders single Select (not MultiSelect) for player search', async () => {
    vi.mocked(useQuery).mockImplementation(() => ({
      data: { players: [], total_count: 0, page_info: { total_pages: 1 } },
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
    }) as any);

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
    // Ensure no chips/pills are rendered for selection (MultiSelect would render pills area)
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
