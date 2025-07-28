import { Tabs } from '@mantine/core';
import { IconGraph, IconStack3, IconTrophy } from '@tabler/icons-react';
import DraftSlotTab from '../analytics/DraftSlotTab';
import Week17BringBackTab from '../analytics/Week17BringBackTab';

const AnalyticsView = () => {
  return (
    <Tabs defaultValue="draftSlot" keepMounted={false}>
      <Tabs.List>
        <Tabs.Tab value="draftSlot" leftSection={<IconGraph size={16} />}>
          Draft Slot
        </Tabs.Tab>
        <Tabs.Tab
          value="week17-bringback"
          leftSection={<IconTrophy size={16} />}
        >
          Week 17 Bring Back
        </Tabs.Tab>
        <Tabs.Tab value="stacks" leftSection={<IconStack3 size={16} />}>
          Stacks (Coming Soon)
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="draftSlot" pt="sm">
        <DraftSlotTab />
      </Tabs.Panel>
      <Tabs.Panel value="week17-bringback" pt="sm">
        <Week17BringBackTab />
      </Tabs.Panel>
      <Tabs.Panel value="stacks" pt="sm">
        <div className="text-center text-gray-500 mt-20">
          Stacks analysis coming soon.
        </div>
      </Tabs.Panel>
    </Tabs>
  );
};

export default AnalyticsView;
