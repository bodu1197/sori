'use client';

import { useQuery } from '@tanstack/react-query';
import { musicApi, SearchFilter, SearchResult, ArtistData, ChartsData } from '@/lib/api/music';

// Query keys
export const musicKeys = {
  all: ['music'] as const,
  search: (query: string, filter?: SearchFilter) => [...musicKeys.all, 'search', query, filter] as const,
  artist: (id: string) => [...musicKeys.all, 'artist', id] as const,
  charts: (country: string) => [...musicKeys.all, 'charts', country] as const,
};

/**
 * Hook for searching music
 */
export function useSearch(query: string, filter?: SearchFilter, options?: { enabled?: boolean }) {
  return useQuery<SearchResult[], Error>({
    queryKey: musicKeys.search(query, filter),
    queryFn: () => musicApi.search(query, filter),
    enabled: options?.enabled !== false && query.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for getting artist info
 */
export function useArtist(channelId: string, options?: { enabled?: boolean }) {
  return useQuery<ArtistData, Error>({
    queryKey: musicKeys.artist(channelId),
    queryFn: () => musicApi.getArtist(channelId),
    enabled: options?.enabled !== false && !!channelId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for getting music charts
 */
export function useCharts(country = 'ZZ') {
  return useQuery<ChartsData, Error>({
    queryKey: musicKeys.charts(country),
    queryFn: () => musicApi.getCharts(country),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
