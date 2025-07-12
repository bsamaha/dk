import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { DraftSlotMetric, DraftSlotResponse } from '../types';

interface UseDraftSlotCorrelationOptions {
  slot: number;
  metric?: DraftSlotMetric;
  topN?: number;
  enabled?: boolean;
}

/**
 * React Query hook for draft slot correlation data.
 */
export const useDraftSlotCorrelation = ({
  slot,
  metric = 'percent',
  topN = 25,
  enabled = true,
}: UseDraftSlotCorrelationOptions) =>
  useQuery<DraftSlotResponse, Error>({
    queryKey: ['draft-slot', slot, metric, topN],
    queryFn: () => apiService.getDraftSlotCorrelation(slot, metric, topN),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
