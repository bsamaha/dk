import { screen, fireEvent } from '@testing-library/react';
import PlayersView from '../../layout/PlayersView';
import { vi, describe, it, expect } from 'vitest';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, QueryClient } from '@tanstack/react-query';
import { renderWithContext } from '../../../test-utils/renderWithContext';

vi.mock('@tanstack/react-query');
vi.mocked(useQuery).mockReturnValue({
  data: {
    players: [
      {
        name: 'Test',
        position: 'QB',
        team: 'Team',
        draft_percentage: 50,
        avg_pick: 10,
        round: 1,
        key: 'test-key',
      },
    ],
    total_count: 1,
  },
  isLoading: false,
  error: null,
  isError: false,
  isPending: false,
  status: 'success',
} as UseQueryResult);

vi.mocked(useQueryClient).mockReturnValue({
  invalidateQueries: vi.fn(),
} as unknown as QueryClient);

describe('PlayersView', () => {
  it('renders player table', () => {
    renderWithContext(<PlayersView />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders in dark mode', () => {
    renderWithContext(<PlayersView />, { colorScheme: 'dark' });
    expect(screen.getByText('Test')).toBeInTheDocument();
    // Test that dark mode class or styles are applied
    // This will depend on your specific implementation
  });

  it('toggles color scheme', () => {
    const { toggleColorScheme } = renderWithContext(<PlayersView />);
    expect(toggleColorScheme).toBeDefined();
    // Test that toggleColorScheme function is accessible
    expect(typeof toggleColorScheme).toBe('function');
  });

  it('handles search', () => {
    renderWithContext(<PlayersView />);
    const searchInput = screen.getByPlaceholderText(
      'Search and select a player...'
    );
    fireEvent.change(searchInput, { target: { value: 'Test' } });
    expect(searchInput).toHaveValue('Test');
  });
  // Add tests for pagination, details collapse, etc.
});
