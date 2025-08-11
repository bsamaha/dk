import { useMemo } from 'react';
import type { PositionStatsResponse } from '../types';
import { type CorePosition, isCorePosition, CHART_COLORS_CORE } from '../utils/chartTheme';

export interface CorePieDatum {
  name: CorePosition;
  value: number;
  count: number;
  color: string;
}

/**
 * Compute pie data for core bestball positions with brand colors.
 * Filters to QB, RB, WR, TE and computes percentages of total drafted.
 */
export const useCorePieData = (
  positionStats?: PositionStatsResponse
): CorePieDatum[] => {
  return useMemo(() => {
    const stats = positionStats?.position_stats ?? [];
    const coreStats = stats.filter(
      (s): s is typeof s & { position: CorePosition } => isCorePosition(s.position)
    );
    const totalCoreDrafted = coreStats.reduce((sum, s) => sum + s.total_drafted, 0);
    return coreStats.map(s => ({
      name: s.position,
      value: totalCoreDrafted ? (s.total_drafted / totalCoreDrafted) * 100 : 0,
      count: s.total_drafted,
      color: CHART_COLORS_CORE[s.position],
    }));
  }, [positionStats]);
};

export default useCorePieData;
