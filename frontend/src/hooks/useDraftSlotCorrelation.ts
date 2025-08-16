import { useQueryPlus } from './useQueryPlus';
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
  useQueryPlus<DraftSlotResponse, Error>({
    queryKey: ['draft-slot', slot, metric, topN],
    queryFn: ({ signal }) => apiService.getDraftSlotCorrelation(slot, metric, topN, signal),
    enabled,
  });
