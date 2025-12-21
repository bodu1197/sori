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
  // YouTube Playlist ID for "View All" top songs (IFrame API용)
  songsPlaylistId?: string;
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

  // All Songs (YouTube Playlist) State
  const [allSongsExpanded, setAllSongsExpanded] = useState(false);
  const [allSongsTracks, setAllSongsTracks] = useState<SearchSong[]>([]);
  const [allSongsLoading, setAllSongsLoading] = useState(false);

  // Albums expansion state
  const [showAllAlbums, setShowAllAlbums] = useState(false);

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
  // Uses /api/search/quick for fast response (1-2 seconds instead of 5-10)
  const performSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    try {
      // 1단계: 초고속 검색 (search()만 호출)
      const response = await fetch(
        `${API_BASE_URL}/api/search/quick?q=${encodeURIComponent(searchQuery.trim())}`
      );

      if (response.ok) {
        const data = await response.json();

        // artist 데이터를 기존 형식에 맞게 변환
        const artist = data.artist
          ? {
              browseId: data.artist.browseId,
              artist: data.artist.name,
              name: data.artist.name,
              thumbnails: data.artist.thumbnail ? [{ url: data.artist.thumbnail }] : [],
              songsPlaylistId: data.artist.songsPlaylistId,
              // 비슷한 아티스트 추가
              related: (data.similarArtists || []).map(
                (a: { browseId: string; name: string; thumbnail: string }) => ({
                  browseId: a.browseId,
                  title: a.name,
                  thumbnails: a.thumbnail ? [{ url: a.thumbnail }] : [],
                })
              ),
            }
          : null;

        setSearchArtist(artist);
        // 앨범 데이터 변환
        setSearchAlbums(
          (data.albums || []).map(
            (a: {
              browseId: string;
              title: string;
              artists: Array<{ name: string; id?: string }>;
              thumbnails: Array<{ url: string }>;
              year?: string;
              type?: string;
            }) => ({
              browseId: a.browseId,
              title: a.title,
              artists: a.artists,
              thumbnails: a.thumbnails,
              year: a.year,
              type: a.type || 'Album',
            })
          )
        );
        setSearchSongs(data.songs || []);

        // 2단계: 플레이리스트 ID 병렬 로드 (All Songs 버튼용)
        if (artist?.browseId && !artist.songsPlaylistId) {
          fetch(
            `${API_BASE_URL}/api/artist/playlist-id?q=${encodeURIComponent(searchQuery.trim())}`
          )
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
    setAllSongsExpanded(false);
    setAllSongsTracks([]);
    setShowAllAlbums(false);
  };

  // Toggle All Songs expansion and fetch tracks
  const toggleAllSongs = async () => {
    if (allSongsExpanded) {
      setAllSongsExpanded(false);
      return;
    }

    setAllSongsExpanded(true);

    // Already have tracks
    if (allSongsTracks.length > 0) return;

    // Fetch tracks from playlist
    if (!searchArtist?.songsPlaylistId) return;

    setAllSongsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlist/${searchArtist.songsPlaylistId}`);
      if (response.ok) {
        const data = await response.json();
        const tracks = data.playlist?.tracks || [];
        setAllSongsTracks(
          tracks.map(
            (t: {
              videoId: string;
              title: string;
              artists?: Artist[];
              thumbnails?: Thumbnail[];
              duration?: string;
              album?: Album;
            }) => ({
              videoId: t.videoId,
              title: t.title,
              artists: t.artists,
              thumbnails: t.thumbnails,
              duration: t.duration,
              album: t.album,
            })
          )
        );
      }
    } catch {
      // Error fetching playlist
    } finally {
      setAllSongsLoading(false);
    }
  };

  // Play track from All Songs list
  const handlePlayAllSongsTrack = (track: SearchSong, index: number) => {
    const panelTracks: PlaylistTrackData[] = allSongsTracks.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artists: song.artists,
      thumbnails: song.thumbnails,
      duration: song.duration,
      album: song.album,
    }));
    openTrackPanel({
      title: `${searchArtist?.artist || 'Artist'} - All Songs`,
      author: { name: `${allSongsTracks.length} ${t('search.tracks')}` },
      thumbnails: searchArtist?.thumbnails,
      tracks: panelTracks,
      trackCount: allSongsTracks.length,
    });

    const playlist = allSongsTracks.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(song.thumbnails),
    }));
    startPlayback(playlist, index);
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

  // Play all songs - fetches All Songs playlist and plays
  const handlePlayAllSongs = async () => {
    // If we already have All Songs tracks, use them
    if (allSongsTracks.length > 0) {
      const panelTracks: PlaylistTrackData[] = allSongsTracks.map((song) => ({
        videoId: song.videoId,
        title: song.title,
        artists: song.artists,
        thumbnails: song.thumbnails,
        duration: song.duration,
        album: song.album,
      }));
      openTrackPanel({
        title: `${searchArtist?.artist || 'Artist'} - All Songs`,
        author: { name: `${allSongsTracks.length} ${t('search.tracks')}` },
        thumbnails: searchArtist?.thumbnails,
        tracks: panelTracks,
        trackCount: allSongsTracks.length,
      });

      const playlist = allSongsTracks.map((song) => ({
        videoId: song.videoId,
        title: song.title,
        artist: song.artists?.[0]?.name || 'Unknown',
        thumbnail: getBestThumbnail(song.thumbnails),
      }));
      startPlayback(playlist, 0);
      return;
    }

    // Fetch All Songs playlist if available
    if (searchArtist?.songsPlaylistId) {
      setAllSongsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/playlist/${searchArtist.songsPlaylistId}`
        );
        if (response.ok) {
          const data = await response.json();
          const tracks = (data.playlist?.tracks || []).map(
            (t: {
              videoId: string;
              title: string;
              artists?: Artist[];
              thumbnails?: Thumbnail[];
              duration?: string;
              album?: Album;
            }) => ({
              videoId: t.videoId,
              title: t.title,
              artists: t.artists,
              thumbnails: t.thumbnails,
              duration: t.duration,
              album: t.album,
            })
          );
          setAllSongsTracks(tracks);

          if (tracks.length > 0) {
            const panelTracks: PlaylistTrackData[] = tracks.map((song: SearchSong) => ({
              videoId: song.videoId,
              title: song.title,
              artists: song.artists,
              thumbnails: song.thumbnails,
              duration: song.duration,
              album: song.album,
            }));
            openTrackPanel({
              title: `${searchArtist?.artist || 'Artist'} - All Songs`,
              author: { name: `${tracks.length} ${t('search.tracks')}` },
              thumbnails: searchArtist?.thumbnails,
              tracks: panelTracks,
              trackCount: tracks.length,
            });

            const playlist = tracks.map((song: SearchSong) => ({
              videoId: song.videoId,
              title: song.title,
              artist: song.artists?.[0]?.name || 'Unknown',
              thumbnail: getBestThumbnail(song.thumbnails),
            }));
            startPlayback(playlist, 0);
          }
        }
      } catch {
        // Error fetching playlist
      } finally {
        setAllSongsLoading(false);
      }
      return;
    }

    // Fallback to top tracks if no playlist available
    if (searchSongs.length === 0) return;
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

  // Shuffle all songs - fetches All Songs playlist and shuffles
  const handleShuffleSearchSongs = async () => {
    // If we already have All Songs tracks, use them
    if (allSongsTracks.length > 0) {
      const panelTracks: PlaylistTrackData[] = allSongsTracks.map((song) => ({
        videoId: song.videoId,
        title: song.title,
        artists: song.artists,
        thumbnails: song.thumbnails,
        duration: song.duration,
        album: song.album,
      }));
      openTrackPanel({
        title: `${searchArtist?.artist || 'Artist'} - All Songs`,
        author: { name: `${allSongsTracks.length} ${t('search.tracks')}` },
        thumbnails: searchArtist?.thumbnails,
        tracks: panelTracks,
        trackCount: allSongsTracks.length,
      });

      const playlist = allSongsTracks.map((song) => ({
        videoId: song.videoId,
        title: song.title,
        artist: song.artists?.[0]?.name || 'Unknown',
        thumbnail: getBestThumbnail(song.thumbnails),
      }));
      const shuffled = [...playlist].sort(() => Math.random() - 0.5);
      startPlayback(shuffled, 0);
      return;
    }

    // Fetch All Songs playlist if available
    if (searchArtist?.songsPlaylistId) {
      setAllSongsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/playlist/${searchArtist.songsPlaylistId}`
        );
        if (response.ok) {
          const data = await response.json();
          const tracks = (data.playlist?.tracks || []).map(
            (t: {
              videoId: string;
              title: string;
              artists?: Artist[];
              thumbnails?: Thumbnail[];
              duration?: string;
              album?: Album;
            }) => ({
              videoId: t.videoId,
              title: t.title,
              artists: t.artists,
              thumbnails: t.thumbnails,
              duration: t.duration,
              album: t.album,
            })
          );
          setAllSongsTracks(tracks);

          if (tracks.length > 0) {
            const panelTracks: PlaylistTrackData[] = tracks.map((song: SearchSong) => ({
              videoId: song.videoId,
              title: song.title,
              artists: song.artists,
              thumbnails: song.thumbnails,
              duration: song.duration,
              album: song.album,
            }));
            openTrackPanel({
              title: `${searchArtist?.artist || 'Artist'} - All Songs`,
              author: { name: `${tracks.length} ${t('search.tracks')}` },
              thumbnails: searchArtist?.thumbnails,
              tracks: panelTracks,
              trackCount: tracks.length,
            });

            const playlist = tracks.map((song: SearchSong) => ({
              videoId: song.videoId,
              title: song.title,
              artist: song.artists?.[0]?.name || 'Unknown',
              thumbnail: getBestThumbnail(song.thumbnails),
            }));
            const shuffled = [...playlist].sort(() => Math.random() - 0.5);
            startPlayback(shuffled, 0);
          }
        }
      } catch {
        // Error fetching playlist
      } finally {
        setAllSongsLoading(false);
      }
      return;
    }

    // Fallback to top tracks if no playlist available
    if (searchSongs.length === 0) return;
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
      <div className="sticky top-0 z-10 bg-white dark:bg-black px-4 py-3 border-b border-gray-100 dark:border-gray-800">
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
            {/* 1. Artist Card - 2층 구조 */}
            {searchArtist && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden">
                {/* 2층: 사진, 이름, 좋아요 버튼 */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-700">
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
                    <h2 className="text-xl font-bold text-black dark:text-white truncate">
                      {searchArtist.artist}
                    </h2>
                    <p className="text-sm text-gray-500">{searchArtist.subscribers || 'Artist'}</p>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition">
                    <Heart size={24} />
                  </button>
                </div>

                {/* 1층: 버튼들 */}
                <div className="flex items-center gap-2 px-4 pb-4">
                  <button
                    onClick={handlePlayAllSongs}
                    className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition"
                  >
                    <Play size={16} fill="currentColor" /> {t('player.playAll')}
                  </button>
                  <button
                    onClick={handleShuffleSearchSongs}
                    className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition text-black dark:text-white"
                  >
                    <Shuffle size={16} /> {t('player.shufflePlay')}
                  </button>
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
                  {(showAllSongs ? searchSongs : searchSongs.slice(0, 5)).map((song, i) => (
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
                {searchSongs.length > 5 && (
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
                        {t('search.showMore')} ({searchSongs.length - 5})
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* 3. All Songs - 펼침 리스트 */}
            {searchArtist?.songsPlaylistId && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
                <button
                  onClick={toggleAllSongs}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center">
                      <ListMusic size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-black dark:text-white">
                        All Songs
                      </div>
                      <div className="text-xs text-gray-500">
                        {allSongsTracks.length > 0
                          ? `${allSongsTracks.length} ${t('search.tracks')}`
                          : t('search.clickToViewTracks')}
                      </div>
                    </div>
                  </div>
                  {allSongsLoading ? (
                    <Loader2 size={18} className="animate-spin text-gray-400" />
                  ) : allSongsExpanded ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </button>

                {allSongsExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {allSongsLoading ? (
                      <div className="p-4 flex items-center justify-center gap-2">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                        <span className="text-sm text-gray-500">{t('search.loadingTracks')}</span>
                      </div>
                    ) : allSongsTracks.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {allSongsTracks.map((song, i) => (
                          <div
                            key={song.videoId || i}
                            onClick={() => handlePlayAllSongsTrack(song, i)}
                            className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
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
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        {t('search.noTracksAvailable')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. Albums & Singles */}
            {searchAlbums.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                  {t('search.albumsAndSingles')} ({searchAlbums.length})
                </h3>
                <div className="space-y-3">
                  {(showAllAlbums ? searchAlbums : searchAlbums.slice(0, 4)).map((album) => {
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
                {searchAlbums.length > 4 && (
                  <button
                    onClick={() => setShowAllAlbums(!showAllAlbums)}
                    className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {showAllAlbums ? (
                      <>
                        <ChevronUp size={16} />
                        {t('search.showLess')}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        {t('search.showMore')} ({searchAlbums.length - 4})
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* 5. Similar Artists */}
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
