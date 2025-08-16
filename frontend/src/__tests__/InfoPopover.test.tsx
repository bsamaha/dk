import { render } from '@testing-library/react';
import InfoPopover from '../components/ui/InfoPopover';
import { MantineProvider } from '@mantine/core';

describe('InfoPopover', () => {
  it('renders trigger', () => {
    render(
      <MantineProvider>
        <InfoPopover label="Test">content</InfoPopover>
      </MantineProvider>
    );
  });
});
