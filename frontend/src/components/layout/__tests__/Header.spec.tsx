import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useAppStore } from '../../../store/appStore';
import { ColorSchemeContext } from '../../../contexts/ColorSchemeContext';
import Header from '../Header';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../store/appStore', () => ({
  useAppStore: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useAppStore).mockReturnValue({
    currentView: 'overview',
    setCurrentView: vi.fn(),
  });
});

describe('Header', () => {
  it('renders navigation buttons', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <MantineProvider>
            <ColorSchemeContext.Provider
              value={{ colorScheme: 'dark', toggleColorScheme: vi.fn() }}
            >
              <Header />
            </ColorSchemeContext.Provider>
          </MantineProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();

    // New brand logo should render as an <img> with alt text
    const logoImg = screen.getByAltText('TheSignalCallers logo');
    expect(logoImg).toBeInTheDocument();

    // Logo should be wrapped in an external link
    const logoLink = logoImg.closest('a');
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', 'https://thesignalcallers.com');
    expect(logoLink).toHaveAttribute('target', '_blank');
    expect(logoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('calls setCurrentView on button click', () => {
    const setCurrentView = vi.fn();
    vi.mocked(useAppStore).mockReturnValue({ setCurrentView });
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <MantineProvider>
            <ColorSchemeContext.Provider
              value={{ colorScheme: 'dark', toggleColorScheme: vi.fn() }}
            >
              <Header />
            </ColorSchemeContext.Provider>
          </MantineProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByText('Players'));
    expect(setCurrentView).toHaveBeenCalledWith('players');
  });
});
