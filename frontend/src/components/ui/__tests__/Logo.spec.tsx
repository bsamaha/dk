import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ColorSchemeContext,
  type ColorSchemeContextValue,
} from '../../../contexts/ColorSchemeContext';
import Logo from '../Logo';

const mockColorSchemeContext: ColorSchemeContextValue = {
  colorScheme: 'light',
  toggleColorScheme: () => {},
};

// Helper function to render with color scheme context
const renderWithContext = (
  component: React.ReactElement,
  colorScheme: 'light' | 'dark' = 'light'
) => {
  const contextValue = { ...mockColorSchemeContext, colorScheme };
  return render(
    <ColorSchemeContext.Provider value={contextValue}>
      {component}
    </ColorSchemeContext.Provider>
  );
};

describe('Logo', () => {
  it('renders with default props in light mode', () => {
    renderWithContext(<Logo />);
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/white_embedded.svg');
  });

  it('renders horizontal variant in dark mode', () => {
    renderWithContext(<Logo variant="horizontal" />, 'dark');
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/dark_embedded.svg');
  });

  it('renders mark variant in dark mode', () => {
    renderWithContext(<Logo variant="mark" />, 'dark');
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/dark_embedded.svg');
  });

  it('renders horizontal variant in light mode', () => {
    renderWithContext(<Logo variant="horizontal" />, 'light');
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/white_embedded.svg');
  });
});
