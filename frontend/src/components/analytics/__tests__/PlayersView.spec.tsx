import { render, screen, fireEvent } from '@testing-library/react';
import PlayersView from '../../layout/PlayersView';
import { vi, describe, it, expect } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import type { UseQueryResult, QueryClient } from '@tanstack/react-query';

vi.mock('@tanstack/react-query');
vi.mocked(useQuery).mockReturnValue({
  data: { players: [{ name: 'Test', position: 'QB', team: 'Team', draft_percentage: 50, avg_pick: 10, round: 1, key: 'test-key' }], total_count: 1 },
  isLoading: false,
  error: null,
  isError: false,
  isPending: false,
  status: 'success'
} as UseQueryResult);

vi.mocked(useQueryClient).mockReturnValue({
  invalidateQueries: vi.fn()
} as unknown as QueryClient);

describe('PlayersView', () => {
  it('renders player table', () => {
    render(
      <MantineProvider>
        <PlayersView />
      </MantineProvider>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles search', () => {
    render(<MantineProvider><PlayersView /></MantineProvider>);
    const searchInput = screen.getByPlaceholderText('Search by player name (e.g., Dobbins)...');
    fireEvent.change(searchInput, { target: { value: 'Test' } });
    expect(searchInput).toHaveValue('Test');
  });
  // Add tests for pagination, details collapse, etc.
}); 