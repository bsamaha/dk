import { Tabs } from '@mantine/core';
import OddsCalculatorTab from '../tools/OddsCalculatorTab';

const ToolsView = () => {
  return (
    <Tabs defaultValue="odds" keepMounted={false}>
      <Tabs.List>
        <Tabs.Tab value="odds">Odds Calculator</Tabs.Tab>
        {/* Future tools can be added here as more Tabs.Tab items */}
      </Tabs.List>
      <Tabs.Panel value="odds" pt="sm">
        <OddsCalculatorTab />
      </Tabs.Panel>
    </Tabs>
  );
};

export default ToolsView;
