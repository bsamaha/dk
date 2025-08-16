import { ActionIcon, Popover, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';

type InfoPopoverProps = {
  label: string;
  width?: number;
  children: React.ReactNode;
};

export default function InfoPopover({ label, width = 320, children }: InfoPopoverProps) {
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} width={width} position="bottom-start" withArrow>
      <Popover.Target>
        <Tooltip label={label}>
          <ActionIcon variant="subtle" size="xs" onClick={() => setOpened(o => !o)}>
            <IconInfoCircle size={14} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        {children}
      </Popover.Dropdown>
    </Popover>
  );
}
