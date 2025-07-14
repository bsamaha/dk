import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../Sidebar';

import type { UseQueryResult } from '@tanstack/react-query';

vi.mock('@tanstack/react-query');

describe('Sidebar', () => {
  it('renders loading skeleton', () => {
    vi.mocked(useQuery).mockReturnValue({ isLoading: true } as UseQueryResult);
    render(<MantineProvider><Sidebar /></MantineProvider>);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders metadata stats', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { total_players: 100, total_drafts: 50, total_teams: 12 },
      isLoading: false
    } as UseQueryResult);
    render(<MantineProvider><Sidebar /></MantineProvider>);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Total Players:')).toBeInTheDocument();
  });
});
