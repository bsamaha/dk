import React from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import {
  ColorSchemeContext,
  type ColorSchemeContextValue,
} from '../contexts/ColorSchemeContext';

interface RenderWithContextOptions {
  colorScheme?: 'light' | 'dark';
  toggleColorScheme?: () => void;
}

/**
 * Centralized test utility for rendering components with theme context.
 * This helps maintain consistent test setup across all components.
 */
export const renderWithContext = (
  component: React.ReactElement,
  options: RenderWithContextOptions = {}
) => {
  const { colorScheme = 'light', toggleColorScheme = vi.fn() } = options;

  const mockColorSchemeContext: ColorSchemeContextValue = {
    colorScheme,
    toggleColorScheme,
  };

  const result = render(
    <ColorSchemeContext.Provider value={mockColorSchemeContext}>
      <MantineProvider>{component}</MantineProvider>
    </ColorSchemeContext.Provider>
  );

  return {
    ...result,
    toggleColorScheme,
    colorScheme,
  };
};
