import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';

// Centralized defaults for queries in this app
// - Mild retry
// - Reasonable caching and refetching behavior
export function useQueryPlus<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
  options: UseQueryOptions<TQueryFnData, TError, TData, QueryKey>
) {
  return useQuery<TQueryFnData, TError, TData, QueryKey>({
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    ...options,
  });
}
