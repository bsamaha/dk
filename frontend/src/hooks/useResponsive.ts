import { useMediaQuery } from '@mantine/hooks';

export const useResponsive = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  // Responsive utilities to reduce boilerplate
  const responsive = {
    // Padding utilities
    padding: isMobile ? 'p-4' : 'p-6',

    // Grid utilities
    singleColumnOnMobile: isMobile
      ? 'grid-cols-1'
      : 'grid-cols-1 md:grid-cols-4',
    chartGrid: isMobile
      ? 'grid-cols-1 gap-4'
      : 'grid-cols-1 lg:grid-cols-2 gap-6',

    // Chart dimensions
    chartHeight: isMobile ? 'h-80' : 'h-96',

    // Typography
    title: isMobile ? 'text-lg' : 'text-xl',
    statText: isMobile ? 'text-lg' : 'text-xl',

    // Component sizes
    inputSize: isMobile ? 'md' : ('sm' as const),

    // Logo size
    logoSize: isMobile ? 40 : 55,

    // Navigation
    navPadding: isMobile ? 'px-2 py-2' : 'px-4 py-2',
    navSpacing: isMobile ? 'space-x-0' : 'space-x-1',

    // Table
    tableMinWidth: isMobile ? 600 : 800,

    // Chart specific
    pieRadius: isMobile ? 80 : 120,
    pieLabelOffset: isMobile ? 15 : 25,
    pieLegendHeight: isMobile ? 50 : 36,

    // Position stats
    positionStatsGrid: isMobile
      ? 'grid-cols-2 gap-3'
      : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4',
    positionStatsPadding: isMobile ? 'p-3' : 'p-4',

    // Controls
    controlsGrid: isMobile
      ? 'grid-cols-1 gap-4'
      : 'grid-cols-1 lg:grid-cols-4 gap-6',
    controlsColumn: isMobile ? 'col-span-1' : 'lg:col-span-3',
    controlsMargin: isMobile ? 'mt-4' : '',

    // Sidebar
    sidebarPosition: isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative',
    sidebarShadow: isMobile ? 'shadow-lg' : '',
    fontSize: {
      small: isMobile ? 11 : 14,
      medium: isMobile ? 12 : 14,
      pieLegend: isMobile ? '12px' : '14px',
      pieLabel: isMobile ? '11px' : '13px',
    },

    // Chart text positioning
    chartTextAnchor: isMobile ? 'end' : 'middle',
    chartAngle: isMobile ? -45 : 0,
    chartAxisHeight: isMobile ? 60 : 30,
  };

  return {
    isMobile,
    isTablet,
    isDesktop,
    responsive,
  };
};
