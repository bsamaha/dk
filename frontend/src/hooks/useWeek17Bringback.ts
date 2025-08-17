import { useQueryPlus } from './useQueryPlus';
import { apiService } from '../services/api';
import type { Week17BringBackResponse, Week17Scope } from '../types';

interface UseWeek17BringbackOptions {
  scope: Week17Scope;
  entity: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for Week 17 bring back data.
 */
export const useWeek17Bringback = ({
  scope,
  entity,
  limit = 10,
  enabled = true,
}: UseWeek17BringbackOptions) =>
  useQueryPlus<Week17BringBackResponse, Error>({
    queryKey: ['week17-bringback', scope, entity, limit],
    queryFn: ({ signal }) => apiService.getWeek17Bringback(scope, entity, limit, signal),
    enabled: enabled && !!entity, // Only enabled if entity is provided
  });
