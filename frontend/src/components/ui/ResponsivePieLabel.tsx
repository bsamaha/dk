import React from 'react';

interface ResponsivePieLabelProps {
  name: string;
  value: number;
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  containerWidth?: number;
  isMobile: boolean;
}

export const ResponsivePieLabel: React.FC<ResponsivePieLabelProps> = ({
  name,
  value,
  cx,
  cy,
  midAngle,
  outerRadius,
  containerWidth = 400,
  isMobile,
}) => {
  const RADIAN = Math.PI / 180;

  // Scale radius offset based on container size and device type
  const baseOffset = isMobile ? 18 : 20;
  const scaleFactor = Math.min(containerWidth / 400, 1.0);
  // Pull labels slightly inward to avoid clipping near container edges
  const radius = outerRadius + baseOffset * scaleFactor - (isMobile ? 8 : 12);

  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Scale font size based on container and value significance
  const baseFontSize = isMobile ? 11 : 13;
  const adjustedFontSize = Math.max(
    baseFontSize * scaleFactor,
    isMobile ? 10 : 12 // Minimum font size
  );

  // Hide labels for very small values on mobile to reduce clutter
  if (isMobile && value < 5) {
    return null;
  }

  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      className="text-gridiron-graphite dark:text-white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={`${adjustedFontSize}px`}
      fontWeight="600"
    >
      {isMobile ? `${value.toFixed(1)}%` : `${name}: ${value.toFixed(1)}%`}
    </text>
  );
};
