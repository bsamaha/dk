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
