import React from 'react';
import { CORE_POSITIONS, type CorePosition } from '../../utils/chartTheme';

export interface PositionLegendProps {
  colors: Record<CorePosition, string>;
  className?: string;
}

export const PositionLegend: React.FC<PositionLegendProps> = ({
  colors,
  className,
}) => {
  return (
    <div
      className={
        className ?? 'mt-0 text-center text-sm font-medium text-gridiron-graphite dark:text-white'
      }
    >
      <div className="inline-flex items-center justify-center gap-4 flex-wrap">
        {CORE_POSITIONS.map(pos => (
          <span key={pos} className="inline-flex items-center gap-2">
            <span
              className="inline-block w-4 h-4 rounded-sm"
              style={{ backgroundColor: colors[pos] }}
            />
            {pos}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PositionLegend;
