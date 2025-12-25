/**
 * Search Page Helper Components and Hooks
 * Extracted from SearchPage.tsx to reduce cognitive complexity
 */
/* eslint-disable react-refresh/only-export-components */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Heart, ChevronDown, ChevronUp, Shuffle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { secureShuffle } from '../../lib/shuffle';
import useAuthStore from '../../stores/useAuthStore';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

// Types (Exported)
export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface Artist {
  name: string;
  id?: string;
}

export interface Album {
  name?: string;
  id?: string;
}

export interface SearchSong {
  videoId: string;
  title: string;
  artists?: Artist[];
  album?: Album;
  thumbnails?: Thumbnail[];
  duration?: string;
}

export interface RelatedArtist {
  name?: string;
  artist?: string;
  title?: string;
  browseId?: string;
  subscribers?: string;
  thumbnails?: Thumbnail[];
}

export interface SearchArtist {
  artist: string;
  browseId?: string;
  subscribers?: string;
  thumbnails?: Thumbnail[];
  related?: RelatedArtist[];
  songsPlaylistId?: string;
}

export interface AlbumTrack {
  videoId: string;
  title: string;
  artists?: Artist[];
  thumbnails?: Thumbnail[];
  duration?: string;
}

export interface SearchAlbum {
  browseId?: string;
  title: string;
  type?: string;
  year?: string;
  thumbnails?: Thumbnail[];
  tracks?: AlbumTrack[];
}

export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  followers_count?: number;
}

// Helper Functions
export function getBestThumbnail(thumbnails?: Thumbnail[]): string {
  if (!thumbnails || thumbnails.length === 0) return '';
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';
}

export function songsToPlaylist(songs: SearchSong[]) {
  return songs.map((s) => ({
    videoId: s.videoId,
    title: s.title,
    artist: s.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
    thumbnail: getBestThumbnail(s.thumbnails),
  }));
}

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
 * Hook for managing artist follow state
 */
export function useArtistFollow() {
  const { user } = useAuthStore();
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set());
  const [followingArtist, setFollowingArtist] = useState(false);

  const checkArtistFollowed = useCallback(
    async (browseId: string) => {
      if (!user || !browseId) return;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('artist_browse_id', browseId)
          .maybeSingle();

        if (!profileData) return;

        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle();

        if (data) {
          setFollowedArtists((prev) => new Set(prev).add(browseId));
        }
      } catch {
        // ignore
      }
    },
    [user]
  );

  const toggleArtistFollow = useCallback(
    async (browseId: string, _artistName: string) => {
      if (!user || !browseId || followingArtist) return;

      setFollowingArtist(true);
      const isFollowed = followedArtists.has(browseId);

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('artist_browse_id', browseId)
          .single();

        if (!profileData) return;
        const artistProfileId = profileData.id;

        if (isFollowed) {
          await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', artistProfileId);

          setFollowedArtists((prev) => {
            const next = new Set(prev);
            next.delete(browseId);
            return next;
          });
        } else {
          await supabase.from('follows').insert({
            follower_id: user.id,
            following_id: artistProfileId,
          });
          setFollowedArtists((prev) => new Set(prev).add(browseId));
        }
      } catch (err) {
        console.error('Error toggling artist follow:', err);
      } finally {
        setFollowingArtist(false);
      }
    },
    [user, followingArtist, followedArtists]
  );

  return { followedArtists, followingArtist, checkArtistFollowed, toggleArtistFollow };
}

// Constants for freshness check
const FRESHNESS_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Check if data is fresh (within 30 days)
 */
function isDataFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  return now - updated < FRESHNESS_DAYS * MS_PER_DAY;
}

/**
 * Search artist from Supabase database
 */
async function searchFromSupabase(query: string): Promise<{
  artist: SearchArtist | null;
  albums: SearchAlbum[];
  songs: SearchSong[];
  isFresh: boolean;
} | null> {
  try {
    // Search artist by name (case-insensitive)
    const { data: artistData } = await supabase
      .from('music_artists')
      .select('browse_id, name, thumbnail_url, songs_playlist_id, updated_at')
      .ilike('name', `%${query.trim()}%`)
      .limit(1)
      .single();

    if (!artistData?.browse_id) return null;

    const isFresh = isDataFresh(artistData.updated_at);

    // Fetch albums and tracks in parallel
    const [albumsResult, tracksResult, relationsResult] = await Promise.all([
      supabase
        .from('music_albums')
        .select('browse_id, title, type, year, thumbnail_url')
        .eq('artist_browse_id', artistData.browse_id)
        .order('year', { ascending: false })
        .limit(20),
      supabase
        .from('music_tracks')
        .select('video_id, title, duration, thumbnail_url')
        .eq('artist_browse_id', artistData.browse_id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('artist_relations')
        .select('related_artist_browse_id')
        .eq('main_artist_browse_id', artistData.browse_id)
        .limit(10),
    ]);

    // Fetch related artist details
    const relatedIds = (relationsResult.data || []).map(
      (r: { related_artist_browse_id: string }) => r.related_artist_browse_id
    );
    let relatedArtists: RelatedArtist[] = [];
    if (relatedIds.length > 0) {
      const { data: relatedData } = await supabase
        .from('music_artists')
        .select('browse_id, name, thumbnail_url')
        .in('browse_id', relatedIds)
        .limit(10);

      relatedArtists = (relatedData || []).map((a) => ({
        browseId: a.browse_id,
        name: a.name,
        title: a.name,
        thumbnails: a.thumbnail_url ? [{ url: a.thumbnail_url }] : [],
      }));
    }

    const artist: SearchArtist = {
      browseId: artistData.browse_id,
      artist: artistData.name,
      thumbnails: artistData.thumbnail_url ? [{ url: artistData.thumbnail_url }] : [],
      songsPlaylistId: artistData.songs_playlist_id,
      related: relatedArtists,
    };

    const albums: SearchAlbum[] = (albumsResult.data || []).map((a) => ({
      browseId: a.browse_id,
      title: a.title,
      type: a.type || 'Album',
      year: a.year,
      thumbnails: a.thumbnail_url ? [{ url: a.thumbnail_url }] : [],
    }));

    const songs: SearchSong[] = (tracksResult.data || []).map((t) => ({
      videoId: t.video_id,
      title: t.title,
      duration: t.duration,
      artists: [{ name: artistData.name }],
      thumbnails: t.thumbnail_url ? [{ url: t.thumbnail_url }] : [],
    }));

    return { artist, albums, songs, isFresh };
  } catch {
    return null;
  }
}

/**
 * Fetch from backend API
 */
async function searchFromAPI(query: string): Promise<{
  artist: SearchArtist | null;
  albums: SearchAlbum[];
  songs: SearchSong[];
} | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/search/quick?q=${encodeURIComponent(query.trim())}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    const artist = data.artist
      ? {
          browseId: data.artist.browseId,
          artist: data.artist.name,
          thumbnails: data.artist.thumbnail ? [{ url: data.artist.thumbnail }] : [],
          songsPlaylistId: data.artist.songsPlaylistId,
          related: (data.similarArtists || []).map(
            (a: { browseId: string; name: string; thumbnail: string }) => ({
              browseId: a.browseId,
              title: a.name,
              thumbnails: a.thumbnail ? [{ url: a.thumbnail }] : [],
            })
          ),
        }
      : null;

    interface AlbumResponse {
      browseId?: string;
      title: string;
      artists?: Artist[];
      thumbnails?: Thumbnail[];
      year?: string;
      type?: string;
    }

    const albums: SearchAlbum[] = (data.albums || []).map((a: AlbumResponse) => ({
      browseId: a.browseId,
      title: a.title,
      artists: a.artists,
      thumbnails: a.thumbnails,
      year: a.year,
      type: a.type || 'Album',
    }));

    return { artist, albums, songs: data.songs || [] };
  } catch {
    return null;
  }
}

/**
 * Hook for managing Music Search Logic
 * Supabase-first: Check DB first, fallback to API if stale or not found
 */
export function useMusicSearch() {
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchArtist, setSearchArtist] = useState<SearchArtist | null>(null);
  const [searchAlbums, setSearchAlbums] = useState<SearchAlbum[]>([]);
  const [searchSongs, setSearchSongs] = useState<SearchSong[]>([]);

  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return;

    setSearchLoading(true);
    setSearchArtist(null);
    setSearchAlbums([]);
    setSearchSongs([]);

    try {
      // 1. Try Supabase first (fast path)
      const dbResult = await searchFromSupabase(query);

      if (dbResult?.artist && dbResult.isFresh) {
        // Data is fresh, use it directly
        setSearchArtist(dbResult.artist);
        setSearchAlbums(dbResult.albums);
        setSearchSongs(dbResult.songs);
        setSearchLoading(false);
        return;
      }

      // 2. Fallback to API (data not found or stale)
      const apiResult = await searchFromAPI(query);

      if (apiResult) {
        setSearchArtist(apiResult.artist);
        setSearchAlbums(apiResult.albums);
        setSearchSongs(apiResult.songs);

        // Fetch playlist ID if not present
        if (apiResult.artist?.browseId && !apiResult.artist.songsPlaylistId) {
          fetch(`${API_BASE_URL}/api/artist/playlist-id?q=${encodeURIComponent(query.trim())}`)
            .then((res) => res.json())
            .then((playlistData) => {
              if (playlistData.playlistId) {
                setSearchArtist((prev) =>
                  prev ? { ...prev, songsPlaylistId: playlistData.playlistId } : null
                );
              }
            })
            .catch(() => {});
        }
      } else if (dbResult?.artist) {
        // API failed but we have stale data, use it
        setSearchArtist(dbResult.artist);
        setSearchAlbums(dbResult.albums);
        setSearchSongs(dbResult.songs);
      }
    } catch {
      setSearchArtist(null);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchArtist(null);
    setSearchAlbums([]);
    setSearchSongs([]);
  }, []);

  return {
    performSearch,
    clearSearch,
    searchLoading,
    searchArtist,
    searchAlbums,
    searchSongs,
    setSearchArtist,
  };
}

/**
 * Hook for managing User Search Logic
 */
export function useUserSearch() {
  const { user } = useAuthStore();
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [newUsers, setNewUsers] = useState<UserProfile[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  const performUserSearch = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) return;
      setUserSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio')
          .or(`username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`)
          .neq('id', user?.id || '')
          .limit(20);

        if (error) throw error;
        setUserResults(data || []);
      } catch (err) {
        console.error(err);
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    },
    [user?.id]
  );

  const fetchSuggestedUsers = useCallback(async () => {
    if (!user) return;
    setSuggestedLoading(true);
    try {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = new Set(followingData?.map((f) => f.following_id) || []);
      followingIds.add(user.id);

      const { data: artistData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, followers_count')
        .eq('member_type', 'artist')
        .limit(100);

      const shuffledArtists = secureShuffle(
        (artistData || []).filter((u) => !followingIds.has(u.id))
      ).slice(0, 10);
      setSuggestedUsers(shuffledArtists);

      const { data: recentPostsData } = await supabase
        .from('posts')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(50);
      const recentUserIds = [...new Set(recentPostsData?.map((p) => p.user_id) || [])];

      let activeFiltered: UserProfile[] = [];
      if (recentUserIds.length > 0) {
        const { data: activeUsers } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, followers_count')
          .in('id', recentUserIds)
          .limit(20);
        activeFiltered = secureShuffle(
          (activeUsers || []).filter((u) => !followingIds.has(u.id))
        ).slice(0, 10);
      } else {
        const { data: regularUsers } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, followers_count')
          .is('member_type', null)
          .limit(50);
        activeFiltered = secureShuffle(
          (regularUsers || []).filter((u) => !followingIds.has(u.id))
        ).slice(0, 10);
      }
      setNewUsers(activeFiltered);
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestedLoading(false);
    }
  }, [user]);

  const clearUserSearch = useCallback(() => {
    setUserResults([]);
  }, []);

  return {
    performUserSearch,
    fetchSuggestedUsers,
    clearUserSearch,
    userResults,
    userSearchLoading,
    suggestedUsers,
    newUsers,
    suggestedLoading,
  };
}

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

  const clearExpanded = useCallback(() => {
    setExpandedAlbums(new Set());
    setLoadingAlbums(new Set());
  }, []);

  return {
    isExpanded,
    isLoading,
    toggleExpand,
    getCachedTracks,
    cacheTracks,
    setLoading,
    clearExpanded,
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

/**
 * Hook for managing liked songs state
 */
export function useLikedSongs() {
  const { user } = useAuthStore();
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());

  const loadLikedSongs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('playlists').select('video_id').eq('user_id', user.id);
      if (data) {
        setLikedSongs(new Set(data.map((item) => item.video_id)));
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data loading on mount is a valid pattern
    loadLikedSongs();
  }, [loadLikedSongs]);

  const isLiked = useCallback((videoId: string) => likedSongs.has(videoId), [likedSongs]);

  const toggleLike = useCallback(
    async (item: { videoId: string; title: string; thumbnails?: Thumbnail[] }) => {
      if (!item.videoId || !user) return;
      const liked = likedSongs.has(item.videoId);

      try {
        if (liked) {
          const { error } = await supabase
            .from('playlists')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', item.videoId);
          if (!error) {
            setLikedSongs((prev) => {
              const n = new Set(prev);
              n.delete(item.videoId);
              return n;
            });
          }
        } else {
          const { error } = await supabase.from('playlists').insert({
            user_id: user.id,
            title: item.title,
            video_id: item.videoId,
            cover_url: getBestThumbnail(item.thumbnails),
            is_public: true,
          });
          if (!error) setLikedSongs((prev) => new Set(prev).add(item.videoId));
        }
      } catch {
        // ignore
      }
    },
    [user, likedSongs]
  );

  return { likedSongs, isLiked, toggleLike };
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
          {isLoading && (
            <div className="p-4 text-center text-sm text-gray-500">
              {t('common.loading', 'Loading...')}
            </div>
          )}
          {!isLoading && tracks && tracks.length > 0 && (
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
                    key={track.videoId || `track-${index}`}
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
          )}
          {!isLoading && (!tracks || tracks.length === 0) && (
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

// User Profile List Item Component
interface UserProfileItemProps {
  readonly profile: UserProfile;
  readonly onNavigate: (id: string) => void;
  readonly followButton: React.ReactNode;
  readonly defaultAvatar: string;
}

export function UserProfileItem({
  profile,
  onNavigate,
  followButton,
  defaultAvatar,
}: UserProfileItemProps) {
  return (
    <button
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer w-full text-left"
      onClick={() => onNavigate(profile.id)}
    >
      <img
        src={profile.avatar_url || defaultAvatar}
        alt={profile.username}
        className="w-14 h-14 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-black dark:text-white truncate">{profile.username}</p>
        {profile.full_name && <p className="text-sm text-gray-500 truncate">{profile.full_name}</p>}
      </div>
      {followButton}
    </button>
  );
}

// User List Section Component
interface UserListSectionProps {
  readonly title: string;
  readonly users: UserProfile[];
  readonly onNavigate: (id: string) => void;
  readonly renderFollowButton: (userId: string) => React.ReactNode;
  readonly defaultAvatar: string;
}

export function UserListSection({
  title,
  users,
  onNavigate,
  renderFollowButton,
  defaultAvatar,
}: UserListSectionProps) {
  if (users.length === 0) return null;

  return (
    <div>
      <h3 className="text-base font-bold mb-3 text-black dark:text-white">{title}</h3>
      <div className="space-y-2">
        {users.map((profile) => (
          <UserProfileItem
            key={profile.id}
            profile={profile}
            onNavigate={onNavigate}
            followButton={renderFollowButton(profile.id)}
            defaultAvatar={defaultAvatar}
          />
        ))}
      </div>
    </div>
  );
}
