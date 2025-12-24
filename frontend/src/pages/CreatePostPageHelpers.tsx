/**
 * CreatePostPage Helper Hooks
 * Extracted from CreatePostPage.tsx to reduce cognitive complexity
 */
import { useState, useEffect, useCallback } from 'react';
import usePlayerStore from '../stores/usePlayerStore';

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

export interface SearchResult {
  videoId: string;
  title: string;
  artists?: Array<{ name: string }>;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  duration?: string;
}

// Helper: Get best thumbnail
export function getBestThumbnail(thumbnails?: Array<{ url: string }>): string | null {
  if (!thumbnails || thumbnails.length === 0) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
}

/**
 * Hook for managing track search with debounce
 */
export function useTrackSearch() {
  const { setTrack } = usePlayerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced search effect
  useEffect(() => {
    async function search() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}&filter=songs&limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Preview a track
  const previewTrack = useCallback(
    (track: SearchResult) => {
      setTrack({
        videoId: track.videoId,
        title: track.title,
        artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown',
        thumbnail: getBestThumbnail(track.thumbnails) || undefined,
      });
    },
    [setTrack]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    previewTrack,
    clearSearch,
  };
}
