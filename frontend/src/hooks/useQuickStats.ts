import type { PositionStatsResponse } from '../types';

export interface QuickStat {
  position: 'QB' | 'RB' | 'WR' | 'TE';
  total: number;
}

export function useQuickStats(
  positionStats?: PositionStatsResponse
): QuickStat[] {
  const quickOrder: Array<'QB' | 'RB' | 'WR' | 'TE'> = ['QB', 'RB', 'WR', 'TE'];
  return quickOrder.map(pos => {
    const s = positionStats?.position_stats.find(ps => ps.position === pos);
    return { position: pos, total: s?.total_drafted ?? 0 };
  });
}
