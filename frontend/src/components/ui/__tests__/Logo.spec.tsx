import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import Logo from '../Logo';
import { renderWithContext } from '../../../test-utils/renderWithContext';

describe('Logo', () => {
  it('renders with default props in light mode', () => {
    renderWithContext(<Logo />);
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/white_embedded.svg');
  });

  it('renders horizontal variant in dark mode', () => {
    renderWithContext(<Logo variant="horizontal" />, { colorScheme: 'dark' });
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/dark_embedded.svg');
  });

  it('renders mark variant in dark mode', () => {
    renderWithContext(<Logo variant="mark" />, { colorScheme: 'dark' });
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/dark_embedded.svg');
  });

  it('renders horizontal variant in light mode', () => {
    renderWithContext(<Logo variant="horizontal" />, { colorScheme: 'light' });
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/white_embedded.svg');
  });
});
