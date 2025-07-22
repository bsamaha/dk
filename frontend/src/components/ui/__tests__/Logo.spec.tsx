import { describe, it, expect } from 'vitest';
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

const renderWithContext = (
  ui: React.ReactElement,
  colorScheme: 'light' | 'dark' = 'light'
) => {
  const contextValue = { ...mockColorSchemeContext, colorScheme };
  return render(
    <ColorSchemeContext.Provider value={contextValue}>
      {ui}
    </ColorSchemeContext.Provider>
  );
};

describe('Logo', () => {
  it('renders the default mark variant in light mode', () => {
    renderWithContext(<Logo />);
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/logo_embedded.svg');
  });

  it('renders the horizontal variant in dark mode', () => {
    renderWithContext(<Logo variant="horizontal" />, 'dark');
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/logo_white_embedded.svg');
  });
});
