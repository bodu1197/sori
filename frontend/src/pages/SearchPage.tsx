import { useEffect, useState, useRef, SyntheticEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Play,
  Shuffle,
  Heart,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  ListMusic,
} from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import { supabase } from '../lib/supabase';

// Cloud Run Backend API (ytmusicapi)
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

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

interface SearchArtist {
  artist: string;
  browseId?: string;
  subscribers?: string;
  thumbnails?: Thumbnail[];
  related?: RelatedArtist[];
  // YouTube Playlist ID for "View All" top songs
  songsPlaylistId?: string;
  songsBrowseId?: string;
}

interface RelatedArtist {
  name?: string;
  artist?: string;
  title?: string;
  browseId?: string;
  subscribers?: string;
  thumbnails?: Thumbnail[];
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

export default function SearchPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    startPlayback,
    currentTrack,
    isPlaying,
    openTrackPanel,
    setTrackPanelLoading,
    loadYouTubePlaylist,
  } = usePlayerStore();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Artist search data
  const [searchArtist, setSearchArtist] = useState<SearchArtist | null>(null);
  const [searchAlbums, setSearchAlbums] = useState<SearchAlbum[]>([]);
  const [searchSongs, setSearchSongs] = useState<SearchSong[]>([]);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());
  const [albumTracks, setAlbumTracks] = useState<Record<string, AlbumTrack[]>>({});
  const [loadingAlbums, setLoadingAlbums] = useState<Set<string>>(new Set());
  const [showAllSongs, setShowAllSongs] = useState(false);

  // Placeholder image for artist/album
  const PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect fill='%23374151' width='120' height='120' rx='60'/%3E%3Ccircle cx='60' cy='45' r='20' fill='%236B7280'/%3E%3Cellipse cx='60' cy='95' rx='35' ry='25' fill='%236B7280'/%3E%3C/svg%3E";

  // Helper to get best (largest) thumbnail
  const getBestThumbnail = (thumbnails?: Thumbnail[]): string => {
    if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
      return PLACEHOLDER;
    }
    return thumbnails[2]?.url || thumbnails[1]?.url || thumbnails[0]?.url || PLACEHOLDER;
  };

  // Toggle album expansion and fetch tracks if needed
  const toggleAlbumExpand = async (album: SearchAlbum) => {
    const albumId = album.browseId || `album-${album.title}`;

    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });

    if (album.tracks && album.tracks.length > 0) {
      return;
    }
    if (albumTracks[albumId]) {
      return;
    }

    if (album.browseId) {
      setLoadingAlbums((prev) => new Set(prev).add(albumId));
      try {
        const response = await fetch(`${API_BASE_URL}/api/album/${album.browseId}`);
        if (response.ok) {
          const data = await response.json();
          // API returns tracks inside data.album.tracks
          const tracks = data.album?.tracks || data.tracks || [];
          if (tracks.length > 0) {
            setAlbumTracks((prev) => ({ ...prev, [albumId]: tracks }));
          }
        }
      } catch {
        // Error fetching album tracks
      } finally {
        setLoadingAlbums((prev) => {
          const next = new Set(prev);
          next.delete(albumId);
          return next;
        });
      }
    }
  };

  // Get tracks for an album (from album data or cache)
  const getAlbumTracks = (album: SearchAlbum): AlbumTrack[] => {
    const albumId = album.browseId || `album-${album.title}`;
    return album.tracks && album.tracks.length > 0 ? album.tracks : albumTracks[albumId] || [];
  };

  // Play album tracks
  const handlePlayAlbum = (album: SearchAlbum) => {
    const tracks = getAlbumTracks(album);
    if (tracks.length === 0) return;
    const playlist = tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
    }));
    startPlayback(playlist, 0);
  };

  // Shuffle album tracks
  const handleShuffleAlbum = (album: SearchAlbum) => {
    const tracks = getAlbumTracks(album);
    if (tracks.length === 0) return;
    const playlist = tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
    }));
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Play a track from album
  const handlePlayAlbumTrack = (album: SearchAlbum, trackIndex: number) => {
    const tracks = getAlbumTracks(album);
    if (tracks.length === 0) return;
    const playlist = tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
    }));
    startPlayback(playlist, trackIndex);
  };

  // Search function - only called on Enter key or button click
  const performSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/search/summary?q=${encodeURIComponent(searchQuery.trim())}`
      );

      if (response.ok) {
        const data = await response.json();
        const artist = data.artists?.[0] || null;
        setSearchArtist(artist);
        setSearchAlbums(data.albums2 || []);
        setSearchSongs(data.songs || []);
      } else {
        setSearchArtist(null);
        setSearchAlbums([]);
        setSearchSongs([]);
      }
    } catch {
      setSearchArtist(null);
      setSearchAlbums([]);
      setSearchSongs([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchArtist(null);
    setSearchAlbums([]);
    setSearchSongs([]);
    setExpandedAlbums(new Set());
    setAlbumTracks({});
    setLoadingAlbums(new Set());
    setShowAllSongs(false);
  };

  // Play a single track from search - opens popup with all songs
  const handlePlayTrackFromSearch = (track: SearchSong, index: number) => {
    // Open popup with all search songs
    const panelTracks: PlaylistTrackData[] = searchSongs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artists: song.artists,
      thumbnails: song.thumbnails,
      duration: song.duration,
      album: song.album,
    }));
    openTrackPanel({
      title: searchArtist?.artist || t('search.topTracks'),
      author: { name: `${searchSongs.length} ${t('search.tracks')}` },
      thumbnails: searchArtist?.thumbnails,
      tracks: panelTracks,
      trackCount: searchSongs.length,
    });

    // Start playback from clicked index
    const playlist = searchSongs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(song.thumbnails),
    }));
    startPlayback(playlist, index);
  };

  // Play all songs from search - opens popup
  const handlePlayAllSongs = () => {
    if (searchSongs.length === 0) return;

    // Open popup
    const panelTracks: PlaylistTrackData[] = searchSongs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artists: song.artists,
      thumbnails: song.thumbnails,
      duration: song.duration,
      album: song.album,
    }));
    openTrackPanel({
      title: searchArtist?.artist || t('search.topTracks'),
      author: { name: `${searchSongs.length} ${t('search.tracks')}` },
      thumbnails: searchArtist?.thumbnails,
      tracks: panelTracks,
      trackCount: searchSongs.length,
    });

    const playlist = searchSongs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(song.thumbnails),
    }));
    startPlayback(playlist, 0);
  };

  // Shuffle songs from search - opens popup
  const handleShuffleSearchSongs = () => {
    if (searchSongs.length === 0) return;

    // Open popup
    const panelTracks: PlaylistTrackData[] = searchSongs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artists: song.artists,
      thumbnails: song.thumbnails,
      duration: song.duration,
      album: song.album,
    }));
    openTrackPanel({
      title: searchArtist?.artist || t('search.topTracks'),
      author: { name: `${searchSongs.length} ${t('search.tracks')}` },
      thumbnails: searchArtist?.thumbnails,
      tracks: panelTracks,
      trackCount: searchSongs.length,
    });

    const playlist = searchSongs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(song.thumbnails),
    }));
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Search for similar artist
  const handleSearchSimilarArtist = (artistName: string) => {
    setSearchQuery(artistName);
  };

  // Fetch album and show in panel
  const handleShowAlbumPanel = async (album: SearchAlbum) => {
    if (!album.browseId) return;

    setTrackPanelLoading(true);
    openTrackPanel({
      title: album.title,
      author: { name: album.type || 'Album' },
      thumbnails: album.thumbnails,
      tracks: [],
      trackCount: 0,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/album/${album.browseId}`);
      if (response.ok) {
        const data = await response.json();
        const albumData = data.album;
        openTrackPanel({
          title: albumData.title || album.title,
          description: albumData.description,
          author: {
            name: albumData.artists?.map((a: { name: string }) => a.name).join(', ') || '',
          },
          thumbnails: albumData.thumbnails || album.thumbnails,
          tracks: albumData.tracks || [],
          trackCount: albumData.trackCount || albumData.tracks?.length || 0,
        });
      }
    } catch {
      // Error fetching album
    } finally {
      setTrackPanelLoading(false);
    }
  };

  // Add song to liked (save to Supabase)
  const handleAddToLiked = async (item: SearchSong | AlbumTrack, albumThumbnails?: Thumbnail[]) => {
    if (!item.videoId || !user) return;

    try {
      const thumbnails = item.thumbnails || albumThumbnails;
      const { error } = await supabase.from('playlists').insert({
        user_id: user.id,
        title: item.title,
        video_id: item.videoId,
        cover_url: getBestThumbnail(thumbnails),
        is_public: true,
      });

      if (error) throw error;
    } catch {
      // Error adding to liked
    }
  };

  const hasResults = searchArtist || searchSongs.length > 0 || searchAlbums.length > 0;

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-xl font-bold mb-3 text-black dark:text-white">{t('search.title')}</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('search.placeholder')}
              className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={performSearch}
            disabled={searchQuery.trim().length < 2 || searchLoading}
            className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={t('search.search')}
          >
            {searchLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div className="p-4">
        {searchLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-gray-500" />
          </div>
        ) : hasResults ? (
          <div className="space-y-6">
            {/* 1. Artist Card */}
            {searchArtist && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    <img
                      src={getBestThumbnail(searchArtist.thumbnails)}
                      alt={searchArtist.artist}
                      className="w-full h-full object-cover"
                      onError={(e: SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-black dark:text-white mb-1">
                      {searchArtist.artist}
                    </h2>
                    <p className="text-sm text-gray-500 mb-3">
                      {searchArtist.subscribers || 'Artist'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {/* YouTube Playlist Play - Fetches full playlist then plays via IFrame API */}
                      {searchArtist.songsPlaylistId && (
                        <button
                          onClick={async () => {
                            // Show loading state
                            setTrackPanelLoading(true);
                            openTrackPanel({
                              title: `${searchArtist.artist} - All Songs`,
                              author: { name: 'Loading...' },
                              thumbnails: searchArtist.thumbnails,
                              tracks: [],
                              trackCount: 0,
                            });

                            try {
                              // Fetch full playlist tracks from backend
                              const response = await fetch(
                                `${API_BASE_URL}/api/playlist/${searchArtist.songsPlaylistId}`
                              );
                              if (response.ok) {
                                const data = await response.json();
                                const playlist = data.playlist;
                                const tracks = playlist?.tracks || [];

                                // Update panel with full tracks
                                openTrackPanel({
                                  title: playlist?.title || `${searchArtist.artist} - All Songs`,
                                  author: { name: `${tracks.length} tracks` },
                                  thumbnails: playlist?.thumbnails || searchArtist.thumbnails,
                                  tracks: tracks.map(
                                    (track: AlbumTrack & { isAvailable?: boolean }) => ({
                                      videoId: track.videoId,
                                      title: track.title,
                                      artists: track.artists,
                                      thumbnails: track.thumbnails,
                                      duration: track.duration,
                                      isAvailable: track.isAvailable,
                                    })
                                  ),
                                  trackCount: tracks.length,
                                });

                                // Start playback with full playlist
                                const playerTracks = tracks
                                  .filter(
                                    (t: AlbumTrack & { isAvailable?: boolean }) =>
                                      t.isAvailable !== false
                                  )
                                  .map((t: AlbumTrack) => ({
                                    videoId: t.videoId,
                                    title: t.title,
                                    artist: t.artists?.[0]?.name || searchArtist.artist,
                                    thumbnail: getBestThumbnail(t.thumbnails),
                                  }));
                                if (playerTracks.length > 0) {
                                  startPlayback(playerTracks, 0);
                                }
                              }
                            } catch {
                              // Fallback to YouTube IFrame API if fetch fails
                              loadYouTubePlaylist(
                                searchArtist.songsPlaylistId!,
                                searchArtist.artist
                              );
                            } finally {
                              setTrackPanelLoading(false);
                            }
                          }}
                          className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-red-700 transition"
                          title="Play all songs via YouTube"
                        >
                          <ListMusic size={14} /> All Songs
                        </button>
                      )}
                      <button
                        onClick={handlePlayAllSongs}
                        className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full text-sm font-semibold hover:opacity-80 transition"
                      >
                        <Play size={14} fill="currentColor" /> {t('player.playAll')}
                      </button>
                      <button
                        onClick={handleShuffleSearchSongs}
                        className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        <Shuffle size={14} /> {t('player.shufflePlay')}
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-500">
                        <Heart size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Top Tracks */}
            {searchSongs.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                  {t('search.topTracks')} ({searchSongs.length})
                </h3>
                <div className="space-y-1">
                  {(showAllSongs ? searchSongs : searchSongs.slice(0, 10)).map((song, i) => (
                    <div
                      key={song.videoId || i}
                      onClick={() => handlePlayTrackFromSearch(song, i)}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <span className="w-6 text-center text-sm text-gray-400">{i + 1}</span>
                      <img
                        src={getBestThumbnail(song.thumbnails)}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-gray-700"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-black dark:text-white truncate">
                          {song.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {song.artists?.[0]?.name}
                          {song.album?.name && ` - ${song.album.name}`}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{song.duration}</span>
                      <button
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          handleAddToLiked(song);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500"
                      >
                        <Heart size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                {searchSongs.length > 10 && (
                  <button
                    onClick={() => setShowAllSongs(!showAllSongs)}
                    className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {showAllSongs ? (
                      <>
                        <ChevronUp size={16} />
                        {t('search.showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        {t('search.showMore')} ({searchSongs.length - 10})
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* 3. Albums & Singles */}
            {searchAlbums.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                  {t('search.albumsAndSingles')} ({searchAlbums.length})
                </h3>
                <div className="space-y-3">
                  {searchAlbums.map((album) => {
                    const albumId = album.browseId || `album-${album.title}`;
                    const isExpanded = expandedAlbums.has(albumId);
                    const isLoading = loadingAlbums.has(albumId);
                    const tracks = getAlbumTracks(album);
                    const trackCount = tracks.length;

                    return (
                      <div
                        key={albumId}
                        className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden"
                      >
                        <div
                          onClick={() => handleShowAlbumPanel(album)}
                          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          <img
                            src={getBestThumbnail(album.thumbnails)}
                            alt={album.title}
                            className="w-20 h-20 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-black dark:text-white truncate">
                              {album.title}
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              {album.type || 'Album'}
                              {album.year && ` - ${album.year}`}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {isLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : isExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                              <span>
                                {isLoading
                                  ? t('common.loading')
                                  : trackCount > 0
                                    ? `${trackCount} ${t('search.tracks')}`
                                    : t('search.clickToViewTracks')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isExpanded && trackCount > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
                              <button
                                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  handlePlayAlbum(album);
                                }}
                                className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full text-xs font-semibold hover:opacity-80"
                              >
                                <Play size={12} fill="currentColor" /> {t('player.playAll')}
                              </button>
                              <button
                                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  handleShuffleAlbum(album);
                                }}
                                className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <Shuffle size={12} /> {t('player.shufflePlay')}
                              </button>
                            </div>
                            <div className="px-3 py-2">
                              {tracks.map((track, trackIdx) => (
                                <div
                                  key={track.videoId || trackIdx}
                                  onClick={(e: MouseEvent<HTMLDivElement>) => {
                                    e.stopPropagation();
                                    handlePlayAlbumTrack(album, trackIdx);
                                  }}
                                  className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 -mx-2"
                                >
                                  <span className="w-5 text-center text-xs text-gray-400">
                                    {trackIdx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-black dark:text-white truncate">
                                      {track.title}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {track.duration || ''}
                                  </span>
                                  <button
                                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                      e.stopPropagation();
                                      handleAddToLiked(track, album.thumbnails);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <Heart size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isExpanded && isLoading && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
                            <Loader2 size={20} className="animate-spin text-gray-400" />
                            <span className="ml-2 text-sm text-gray-500">
                              {t('search.loadingTracks')}
                            </span>
                          </div>
                        )}

                        {isExpanded && !isLoading && trackCount === 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-center text-sm text-gray-500">
                            {t('search.noTracksAvailable')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Similar Artists */}
            {searchArtist?.related && searchArtist.related.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                  {t('search.similarArtists')} ({searchArtist.related.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {searchArtist.related.map((artist, i) => {
                    const artistName = artist.name || artist.artist || artist.title || 'Unknown';
                    return (
                      <div
                        key={artist.browseId || `related-${i}`}
                        onClick={() => handleSearchSimilarArtist(artistName)}
                        className="flex flex-col items-center cursor-pointer group"
                      >
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2 group-hover:ring-2 ring-black dark:ring-white transition">
                          <img
                            src={getBestThumbnail(artist.thumbnails)}
                            alt={artistName}
                            className="w-full h-full object-cover"
                            onError={(e: SyntheticEvent<HTMLImageElement>) => {
                              e.currentTarget.src = PLACEHOLDER;
                            }}
                          />
                        </div>
                        <span className="text-xs text-center text-black dark:text-white font-medium truncate w-full px-1">
                          {artistName}
                        </span>
                        {artist.subscribers && (
                          <span className="text-xs text-gray-500 truncate w-full text-center">
                            {artist.subscribers}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t('search.hint')}</p>
            <p className="text-sm mt-2 text-gray-400">{t('search.pressEnter')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
