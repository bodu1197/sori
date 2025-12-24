/**
 * Search Page Helper Components and Hooks
 * Extracted from SearchPage.tsx to reduce cognitive complexity
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Heart, ChevronDown, ChevronUp, Shuffle } from 'lucide-react';

// Types
interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface Artist {
  name: string;
  id?: string;
}

interface Album {
  name?: string;
  id?: string;
}

interface SearchSong {
  videoId: string;
  title: string;
  artists?: Artist[];
  album?: Album;
  thumbnails?: Thumbnail[];
  duration?: string;
}

interface SearchAlbum {
  browseId?: string;
  title: string;
  type?: string;
  year?: string;
  thumbnails?: Thumbnail[];
  tracks?: AlbumTrack[];
}

interface AlbumTrack {
  videoId: string;
  title: string;
  artists?: Artist[];
  thumbnails?: Thumbnail[];
  duration?: string;
}

// Helper Functions

/**
 * Get the best (highest quality) thumbnail from an array
 */
export function getBestThumbnail(thumbnails?: Thumbnail[]): string {
  if (!thumbnails || thumbnails.length === 0) return '';
  // Usually the last one is the largest
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';
}

/**
 * Convert songs to playlist format for player
 */
export function songsToPlaylist(songs: SearchSong[]) {
  return songs.map((s) => ({
    videoId: s.videoId,
    title: s.title,
    artist: s.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
    thumbnail: getBestThumbnail(s.thumbnails),
  }));
}

/**
 * Convert album tracks to playlist format
 */
export function albumTracksToPlaylist(tracks: AlbumTrack[], album: SearchAlbum) {
  return tracks.map((t) => ({
    videoId: t.videoId,
    title: t.title,
    artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
    thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
  }));
}

// Custom Hooks

/**
 * Hook for managing expanded album state
 */
export function useExpandedAlbums() {
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
  const [albumTracksCache, setAlbumTracksCache] = useState<Map<string, AlbumTrack[]>>(new Map());
  const [loadingAlbums, setLoadingAlbums] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((albumId: string) => {
    setExpandedAlbums((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(albumId)) {
        newSet.delete(albumId);
      } else {
        newSet.add(albumId);
      }
      return newSet;
    });
  }, []);

  const isExpanded = useCallback(
    (albumId: string) => expandedAlbums.has(albumId),
    [expandedAlbums]
  );
  const isLoading = useCallback((albumId: string) => loadingAlbums.has(albumId), [loadingAlbums]);
  const getCachedTracks = useCallback(
    (albumId: string) => albumTracksCache.get(albumId),
    [albumTracksCache]
  );

  const setLoading = useCallback((albumId: string, loading: boolean) => {
    setLoadingAlbums((prev) => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(albumId);
      } else {
        newSet.delete(albumId);
      }
      return newSet;
    });
  }, []);

  const cacheTracks = useCallback((albumId: string, tracks: AlbumTrack[]) => {
    setAlbumTracksCache((prev) => new Map(prev).set(albumId, tracks));
  }, []);

  return {
    isExpanded,
    isLoading,
    toggleExpand,
    getCachedTracks,
    cacheTracks,
    setLoading,
  };
}

/**
 * Hook for managing show more/less state
 */
export function useShowMore(initialLimit: number = 5) {
  const [showAll, setShowAll] = useState(false);

  const toggle = useCallback(() => setShowAll((prev) => !prev), []);
  const getDisplayItems = useCallback(
    <T,>(items: T[]): T[] => (showAll ? items : items.slice(0, initialLimit)),
    [showAll, initialLimit]
  );
  const hasMore = useCallback((items: unknown[]) => items.length > initialLimit, [initialLimit]);

  return { showAll, toggle, getDisplayItems, hasMore };
}

// Components

interface SongListItemProps {
  readonly song: SearchSong;
  readonly index: number;
  readonly onPlay: (index: number) => void;
  readonly isLiked?: boolean;
  readonly onToggleLike?: () => void;
}

export function SongListItem({ song, index, onPlay, isLiked, onToggleLike }: SongListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onPlay(index)}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition w-full text-left group"
    >
      <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
      <img
        src={getBestThumbnail(song.thumbnails) || 'https://via.placeholder.com/40'}
        alt={song.title}
        className="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-gray-700"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{song.title}</div>
        <div className="text-xs text-gray-500 truncate">
          {song.artists?.map((a) => a.name).join(', ')}
          {song.album?.name && ` • ${song.album.name}`}
        </div>
      </div>
      <span className="text-xs text-gray-400">{song.duration}</span>
      {onToggleLike && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
      )}
    </button>
  );
}

interface AlbumCardProps {
  readonly album: SearchAlbum;
  readonly isExpanded: boolean;
  readonly isLoading: boolean;
  readonly tracks?: AlbumTrack[];
  readonly onToggleExpand: () => void;
  readonly onPlayAll: () => void;
  readonly onShuffle: () => void;
  readonly onPlayTrack: (index: number) => void;
}

export function AlbumCard({
  album,
  isExpanded,
  isLoading,
  tracks,
  onToggleExpand,
  onPlayAll,
  onShuffle,
  onPlayTrack,
}: AlbumCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
      {/* Album Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex items-start gap-3 p-3 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <img
          src={getBestThumbnail(album.thumbnails) || 'https://via.placeholder.com/80'}
          alt={album.title}
          className="w-20 h-20 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
        />
        <div className="flex-1 min-w-0 py-1">
          <div className="font-semibold text-sm truncate">{album.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {album.type || 'Album'} {album.year && `• ${album.year}`}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {t('search.clickToViewTracks', 'Click to view tracks')}
          </div>
        </div>
        <div className="p-2">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expanded Tracks */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {t('common.loading', 'Loading...')}
            </div>
          ) : tracks && tracks.length > 0 ? (
            <>
              {/* Play/Shuffle Buttons */}
              <div className="flex gap-2 p-3">
                <button
                  type="button"
                  onClick={onPlayAll}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium"
                >
                  <Play size={16} fill="currentColor" />
                  {t('search.playAll', 'Play All')}
                </button>
                <button
                  type="button"
                  onClick={onShuffle}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium"
                >
                  <Shuffle size={16} />
                  {t('search.shuffle', 'Shuffle')}
                </button>
              </div>
              {/* Track List */}
              <div className="px-3 pb-3 space-y-1">
                {tracks.map((track, index) => (
                  <button
                    type="button"
                    key={track.videoId || index}
                    onClick={() => onPlayTrack(index)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition w-full text-left"
                  >
                    <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{track.title}</div>
                    </div>
                    <span className="text-xs text-gray-400">{track.duration}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              {t('search.noTracks', 'No tracks available')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ShowMoreButtonProps {
  readonly showAll: boolean;
  readonly remainingCount: number;
  readonly onToggle: () => void;
}

export function ShowMoreButton({ showAll, remainingCount, onToggle }: ShowMoreButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
    >
      {showAll
        ? t('search.showLess', 'Show Less')
        : `${t('search.showMore', 'Show More')} (${remainingCount})`}
    </button>
  );
}
