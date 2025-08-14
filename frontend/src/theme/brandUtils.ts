import { useMantineTheme } from '@mantine/core';

export interface BrandPalette {
  signal: string;
  gold: string;
  turf: string;
  graphite: string;
  negative: string;
  negativeDark: string;
}

export function useBrandColors(): BrandPalette {
  const theme = useMantineTheme();
  const colors = theme.colors as unknown as Record<string, string[]>;
  return {
    signal: colors.signal?.[6] || '#00A86B',
    gold: colors.gold?.[6] || '#FFC300',
    turf: colors.turf?.[6] || '#016140',
    graphite: colors.graphite?.[9] || '#1E1E1E',
    negative: theme.colors.red?.[6] || '#EF4444',
    negativeDark: theme.colors.red?.[7] || '#DC2626',
  };
}
