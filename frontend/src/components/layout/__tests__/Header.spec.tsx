import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useAppStore } from '../../../store/appStore';
import Header from '../Header';

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
    render(<MantineProvider><Header /></MantineProvider>);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
  });

  it('calls setCurrentView on button click', () => {
    const setCurrentView = vi.fn();
    vi.mocked(useAppStore).mockReturnValue({ setCurrentView });
    render(<MantineProvider><Header /></MantineProvider>);
    fireEvent.click(screen.getByText('Players'));
    expect(setCurrentView).toHaveBeenCalledWith('players');
  });
});
