import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';

type AnyFn<T> = () => Promise<T>;

export function useApiQuery<T>(key: QueryKey, fn: AnyFn<T>, options?: Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: fn,
    retry: 2,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    ...options,
  });
}
