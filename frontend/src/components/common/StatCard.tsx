import { Card, Group, Text } from '@mantine/core';
import { useBrandColors } from '../../theme/brandUtils';
import { useColorScheme } from '../../contexts/ColorSchemeContext';

interface StatCardProps {
  label: string;
  value: string;
  highlight?: 'signal' | 'gold' | 'negative' | 'neutral';
  copyAction?: React.ReactNode;
}

export function StatCard({ label, value, highlight = 'neutral', copyAction }: StatCardProps) {
  const { signal, gold, graphite, negative } = useBrandColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const color = highlight === 'signal'
    ? signal
    : highlight === 'gold'
    ? gold
    : highlight === 'negative'
    ? negative
    : isDark
    ? '#FFFFFF'
    : graphite;

  return (
    <Card withBorder p="sm" radius="md" style={{ borderColor: `${signal}20`, background: 'transparent' }}>
      <div className="text-center">
        <Text size="xs" c="dimmed" fw={500} style={{ color: isDark ? '#D1D5DB' : undefined }}>{label.toUpperCase()}</Text>
        <Group justify="center" gap="xs">
          <Text size="lg" fw={700} style={{ color }}>{value}</Text>
          {copyAction}
        </Group>
      </div>
    </Card>
  );
}

export default StatCard;
