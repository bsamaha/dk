import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Logo from '../Logo';

describe('Logo', () => {
  it('renders the default mark variant', () => {
    render(<Logo />);
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/brand/logo_embedded.svg');
  });

  it('renders the horizontal variant', () => {
    render(<Logo variant="horizontal" />);
    const img = screen.getByAltText('TheSignalCallers logo');
    expect(img).toBeInTheDocument();
  });
});
