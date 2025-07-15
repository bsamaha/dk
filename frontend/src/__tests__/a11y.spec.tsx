/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
// vitest-axe brings jest-style matchers; extend them here
import * as a11yMatchers from 'vitest-axe/matchers';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(a11yMatchers as any);
import App from '../App';

describe('Accessibility', () => {
  it('App should have no basic axe violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container, {
      rules: {
        // Disable color-contrast rule temporarily; requires manual validation for charts
        'color-contrast': { enabled: false },
      },
    });
    // @ts-expect-error: custom matcher injected by vitest-axe
    expect(results).toHaveNoViolations();
  });
});
