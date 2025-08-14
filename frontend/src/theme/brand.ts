import { createTheme, rem, type MantineColorsTuple } from '@mantine/core';

// Brand color palettes approximated across 10 shades
const SIGNAL: MantineColorsTuple = [
  '#E6F9F2',
  '#C0F1E0',
  '#99E9CD',
  '#73E1BB',
  '#4CD9A8',
  '#26D196',
  '#00A86B',
  '#008F5C',
  '#00764D',
  '#005E3E',
];

const GOLD: MantineColorsTuple = [
  '#FFF7CC',
  '#FFF0B3',
  '#FFE999',
  '#FFE280',
  '#FFDB66',
  '#FFD44D',
  '#FFC300',
  '#E6B000',
  '#CC9D00',
  '#B38900',
];

const TURF: MantineColorsTuple = [
  '#D6F2E9',
  '#B9E6DB',
  '#9CDBCE',
  '#80CFC0',
  '#63C4B3',
  '#46B8A5',
  '#016140',
  '#01553A',
  '#014A34',
  '#013F2E',
];

const GRAPHITE: MantineColorsTuple = [
  '#F5F5F5',
  '#E6E6E6',
  '#CCCCCC',
  '#B3B3B3',
  '#999999',
  '#808080',
  '#666666',
  '#4D4D4D',
  '#333333',
  '#1E1E1E',
];

export const brandTheme = createTheme({
  primaryColor: 'signal',
  primaryShade: 6,
  colors: {
    signal: SIGNAL,
    gold: GOLD,
    turf: TURF,
    graphite: GRAPHITE,
  },
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily:
      'Space Grotesk, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    sizes: {
      h1: { fontSize: rem(32), fontWeight: '700', lineHeight: '1.2' },
      h2: { fontSize: rem(28), fontWeight: '700', lineHeight: '1.25' },
      h3: { fontSize: rem(24), fontWeight: '700', lineHeight: '1.3' },
      h4: { fontSize: rem(20), fontWeight: '700', lineHeight: '1.35' },
      h5: { fontSize: rem(18), fontWeight: '700', lineHeight: '1.4' },
      h6: { fontSize: rem(16), fontWeight: '700', lineHeight: '1.4' },
    },
  },
  radius: {
    md: rem(12),
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        color: 'signal',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
    },
    Tooltip: {
      defaultProps: {
        color: 'graphite',
      },
    },
    Badge: {
      defaultProps: {
        color: 'turf',
      },
    },
  },
});

export type BrandTheme = typeof brandTheme;
