import { render } from '@testing-library/react';
import { ThemedBarChart } from '../components/ui/charts/ThemedBarChart';
import { ColorSchemeContext } from '../contexts/ColorSchemeContext';

describe('ThemedBarChart', () => {
  it('renders without crashing', () => {
    const data = [
      { round: 'R1', value: 10 },
      { round: 'R2', value: 5 },
    ];
    render(
      <ColorSchemeContext.Provider value={{ colorScheme: 'light', toggleColorScheme: () => {} }}>
        <div style={{ width: 600, height: 300 }}>
          <ThemedBarChart data={data} layout="horizontal" xLabel="Round" yDataKey="value" xDataKey="round" />
        </div>
      </ColorSchemeContext.Provider>
    );
  });
});
