/**
 * Shared utilities for chart theming to maintain consistency across components
 */

export interface TooltipStyle {
  backgroundColor: string;
  border: string;
  borderRadius: string;
  boxShadow: string;
  color: string;
}

export interface CursorStyle {
  fill: string;
  opacity: number;
}

/**
 * Get tooltip styles based on current theme
 */
export const getTooltipStyle = (isDark: boolean): TooltipStyle => ({
  backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
  border: isDark ? '1px solid #016140' : '1px solid #e5e7eb',
  borderRadius: '6px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  color: isDark ? '#FFFFFF' : '#000000',
});

/**
 * Get cursor styles based on current theme
 */
export const getCursorStyle = (isDark: boolean): CursorStyle => ({
  fill: isDark ? '#383838' : '#c7c7c7',
  opacity: 0.3,
});

/**
 * Get responsive tooltip styles with theme support
 */
export const getResponsiveTooltipStyle = (
  isDark: boolean,
  windowWidth: number
): TooltipStyle & { padding: string; fontSize: string; maxWidth: string } => ({
  ...getTooltipStyle(isDark),
  padding: windowWidth < 640 ? '8px' : '12px',
  fontSize: windowWidth < 640 ? '12px' : '13px',
  maxWidth: windowWidth < 640 ? '250px' : '300px',
});

/**
 * Chart color constants based on brand book
 */
export const CHART_COLORS = {
  primary: '#00A86B', // Signal Green
  secondary: '#FFC300', // Audible Gold
  tertiary: '#016140', // Turf Dark Green
  quaternary: '#1E1E1E', // Gridiron Graphite
  accent1: '#89C4AA', // Lighter green
  accent2: '#0891b2', // Blue-ish
} as const;

/**
 * Get primary chart color (theme-aware if needed)
 */
export const getPrimaryChartColor = (): string => {
  // For now, use the same color for both themes
  // Could be expanded to support different colors per theme
  return CHART_COLORS.primary;
};

/**
 * Get bar chart props with consistent styling
 */
export const getBarChartProps = () => ({
  fill: getPrimaryChartColor(),
  radius: [2, 2, 0, 0] as [number, number, number, number],
});

/**
 * Get grid stroke color based on theme
 */
export const getGridStroke = (isDark: boolean): string =>
  isDark ? '#555' : '#e5e7eb';

/**
 * Get axis tick color based on theme
 */
export const getAxisTickColor = (isDark: boolean): string =>
  isDark ? '#E5E7EB' : '#4B5563';

/**
 * Get chart background style based on theme
 */
export const getChartBackground = (isDark: boolean) => ({
  backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
  border: `1px solid ${isDark ? CHART_COLORS.tertiary : '#E5E7EB'}`,
});

/**
 * Position colors for charts (from brand book)
 */
export const POSITION_COLORS = {
  QB: CHART_COLORS.primary, // Signal Green
  RB: CHART_COLORS.secondary, // Audible Gold
  WR: CHART_COLORS.tertiary, // Turf Dark Green
  TE: CHART_COLORS.quaternary, // Gridiron Graphite
  K: CHART_COLORS.accent1, // Lighter green
  DST: CHART_COLORS.accent2, // Blue-ish
} as const;

/**
 * Core bestball positions and colors
 * Use this map across components to ensure consistency with brand book
 */
export const CORE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;
export type CorePosition = (typeof CORE_POSITIONS)[number];

// Brand-aligned, distinct colors per core position
export const POSITION_COLORS_CORE: Record<CorePosition, string> = {
  WR: CHART_COLORS.primary, // Signal Green
  RB: CHART_COLORS.secondary, // Audible Gold
  TE: CHART_COLORS.quaternary, // Gridiron Graphite
  QB: CHART_COLORS.accent2, // Blue-ish accent
};

/**
 * Type guard for core bestball positions
 */
export const isCorePosition = (value: string): value is CorePosition =>
  (CORE_POSITIONS as readonly string[]).includes(value);

/**
 * Get position color by position name
 */
export const getPositionColor = (position: string): string => {
  return (
    POSITION_COLORS[position as keyof typeof POSITION_COLORS] ||
    CHART_COLORS.primary
  );
};
