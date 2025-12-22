import { useEffect, useState, useRef, SyntheticEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  Music,
  Users,
} from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import { supabase } from '../lib/supabase';
import { FollowButton } from '../components/social';
import { DEFAULT_AVATAR } from '../components/common';

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

interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  followers_count?: number;
}

type SearchTab = 'music' | 'users';

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { startPlayback, openTrackPanel, setTrackPanelLoading } = usePlayerStore();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SearchTab>('music');

  // User search state
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Suggested users (shown when no search)
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [newUsers, setNewUsers] = useState<UserProfile[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  // Fetch suggested users (popular + new users)
  const fetchSuggestedUsers = async () => {
    if (!user) return;

    setSuggestedLoading(true);
    try {
      // Get users I'm already following
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = new Set(followingData?.map((f) => f.following_id) || []);
      followingIds.add(user.id); // Exclude self

      // Fetch popular users (by followers count, excluding already followed)
      const { data: popularData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, followers_count')
        .order('followers_count', { ascending: false })
        .limit(30);

      // Filter out already followed users
      const popular = (popularData || []).filter((u) => !followingIds.has(u.id)).slice(0, 10);

      setSuggestedUsers(popular);

      // Fetch newest users (by updated_at since created_at doesn't exist)
      const { data: newData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, followers_count')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(30);

      // Filter out already followed users and self
      const newFiltered = (newData || []).filter((u) => !followingIds.has(u.id)).slice(0, 10);

      setNewUsers(newFiltered);
    } catch (err) {
      console.error('Error fetching suggested users:', err);
    } finally {
      setSuggestedLoading(false);
    }
  };

  // Load suggested users when Users tab is active
  useEffect(() => {
    if (activeTab === 'users' && suggestedUsers.length === 0 && !suggestedLoading) {
      fetchSuggestedUsers();
    }
  }, [activeTab]);

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

  // Liked songs state (for heart icon)
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const [likedAlbums, setLikedAlbums] = useState<Set<string>>(new Set());
  const [savingAlbums, setSavingAlbums] = useState<Set<string>>(new Set());

  // Load liked songs from DB on mount
  useEffect(() => {
    const loadLikedSongs = async () => {
      if (!user) return;

      try {
        const { data } = await supabase.from('playlists').select('video_id').eq('user_id', user.id);

        if (data) {
          const videoIds = new Set(data.map((item) => item.video_id));
          setLikedSongs(videoIds);
        }
      } catch {
        // Error loading liked songs
      }
    };

    loadLikedSongs();
  }, [user]);

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

  // Helper to convert songs to playlist format
  const songsToPlaylist = (songs: SearchSong[]) =>
    songs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(song.thumbnails),
    }));

  // Helper to convert songs to panel tracks format
  const songsToPanelTracks = (songs: SearchSong[]): PlaylistTrackData[] =>
    songs.map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artists: song.artists,
      thumbnails: song.thumbnails,
      duration: song.duration,
      album: song.album,
    }));

  // Helper to convert album tracks to playlist format
  const albumTracksToPlaylist = (tracks: AlbumTrack[], album: SearchAlbum) =>
    tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
    }));

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
    startPlayback(albumTracksToPlaylist(tracks, album), 0);
  };

  // Shuffle album tracks
  const handleShuffleAlbum = (album: SearchAlbum) => {
    const tracks = getAlbumTracks(album);
    if (tracks.length === 0) return;
    const shuffled = [...albumTracksToPlaylist(tracks, album)].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Play a track from album
  const handlePlayAlbumTrack = (album: SearchAlbum, trackIndex: number) => {
    const tracks = getAlbumTracks(album);
    if (tracks.length === 0) return;
    startPlayback(albumTracksToPlaylist(tracks, album), trackIndex);
  };

  // Search function - only called on Enter key or button click
  // Uses /api/search/quick for fast response (1-2 seconds instead of 5-10)
  const performSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    setAllSongsTracks([]);
    setAllSongsExpanded(false);
    setShowAllSongs(false);
    setExpandedAlbums(new Set());
    setAlbumTracks({});
    setLoadingAlbums(new Set());
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

  // User search function
  const performUserSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setUserSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .or(`username.ilike.%${searchQuery.trim()}%,full_name.ilike.%${searchQuery.trim()}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;
      setUserResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setUserResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeTab === 'music') {
        performSearch();
      } else {
        performUserSearch();
      }
    }
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (activeTab === 'music') {
      performSearch();
    } else {
      performUserSearch();
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
    setUserResults([]);
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

  // Helper to open panel and play songs
  const openPanelAndPlay = (
    songs: SearchSong[],
    title: string,
    index: number,
    thumbnails?: Thumbnail[]
  ) => {
    openTrackPanel({
      title,
      author: { name: `${songs.length} ${t('search.tracks')}` },
      thumbnails,
      tracks: songsToPanelTracks(songs),
      trackCount: songs.length,
    });
    startPlayback(songsToPlaylist(songs), index);
  };

  // Play track from All Songs list
  const handlePlayAllSongsTrack = (track: SearchSong, index: number) => {
    openPanelAndPlay(
      allSongsTracks,
      `${searchArtist?.artist || 'Artist'} - All Songs`,
      index,
      searchArtist?.thumbnails
    );
  };

  // Play a single track from search - opens popup with all songs
  const handlePlayTrackFromSearch = (track: SearchSong, index: number) => {
    openPanelAndPlay(
      searchSongs,
      searchArtist?.artist || t('search.topTracks'),
      index,
      searchArtist?.thumbnails
    );
  };

  // Helper to start playback with panel
  const startPlaybackWithPanel = (
    songs: SearchSong[],
    title: string,
    shuffle: boolean,
    thumbnails?: Thumbnail[]
  ) => {
    openTrackPanel({
      title,
      author: { name: `${songs.length} ${t('search.tracks')}` },
      thumbnails,
      tracks: songsToPanelTracks(songs),
      trackCount: songs.length,
    });
    const playlist = songsToPlaylist(songs);
    startPlayback(shuffle ? [...playlist].sort(() => Math.random() - 0.5) : playlist, 0);
  };

  // Fetch and play songs from playlist
  const fetchAndPlayPlaylist = async (
    playlistId: string,
    title: string,
    shuffle: boolean,
    thumbnails?: Thumbnail[]
  ) => {
    setAllSongsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlist/${playlistId}`);
      if (response.ok) {
        const data = await response.json();
        const tracks: SearchSong[] = (data.playlist?.tracks || []).map(
          (trackData: {
            videoId: string;
            title: string;
            artists?: Artist[];
            thumbnails?: Thumbnail[];
            duration?: string;
            album?: Album;
          }) => ({
            videoId: trackData.videoId,
            title: trackData.title,
            artists: trackData.artists,
            thumbnails: trackData.thumbnails,
            duration: trackData.duration,
            album: trackData.album,
          })
        );
        setAllSongsTracks(tracks);
        if (tracks.length > 0) {
          startPlaybackWithPanel(tracks, title, shuffle, thumbnails);
        }
      }
    } catch {
      // Error fetching playlist
    } finally {
      setAllSongsLoading(false);
    }
  };

  // Helper to play or shuffle songs with panel
  const playOrShuffleSongs = async (shuffle: boolean) => {
    const allSongsTitle = `${searchArtist?.artist || 'Artist'} - All Songs`;

    // If we already have All Songs tracks, use them
    if (allSongsTracks.length > 0) {
      startPlaybackWithPanel(allSongsTracks, allSongsTitle, shuffle, searchArtist?.thumbnails);
      return;
    }

    // Fetch All Songs playlist if available
    if (searchArtist?.songsPlaylistId) {
      await fetchAndPlayPlaylist(
        searchArtist.songsPlaylistId,
        allSongsTitle,
        shuffle,
        searchArtist?.thumbnails
      );
      return;
    }

    // Fallback to top tracks if no playlist available
    if (searchSongs.length === 0) return;
    startPlaybackWithPanel(
      searchSongs,
      searchArtist?.artist || t('search.topTracks'),
      shuffle,
      searchArtist?.thumbnails
    );
  };

  // Play all songs
  const handlePlayAllSongs = () => playOrShuffleSongs(false);

  // Shuffle all songs
  const handleShuffleSearchSongs = () => playOrShuffleSongs(true);

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

  // Toggle song like (add or remove)
  const handleToggleLike = async (item: SearchSong | AlbumTrack, albumThumbnails?: Thumbnail[]) => {
    if (!item.videoId || !user) return;

    const isLiked = likedSongs.has(item.videoId);

    try {
      if (isLiked) {
        // Remove from liked
        const { error } = await supabase
          .from('playlists')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', item.videoId);

        if (!error) {
          setLikedSongs((prev) => {
            const next = new Set(prev);
            next.delete(item.videoId);
            return next;
          });
        }
      } else {
        // Add to liked
        const thumbnails = item.thumbnails || albumThumbnails;
        const { error } = await supabase.from('playlists').insert({
          user_id: user.id,
          title: item.title,
          video_id: item.videoId,
          cover_url: getBestThumbnail(thumbnails),
          is_public: true,
        });

        if (!error) {
          setLikedSongs((prev) => new Set(prev).add(item.videoId));
        }
      }
    } catch {
      // Error toggling like
    }
  };

  // Toggle album like (add or remove all tracks)
  const handleToggleAlbumLike = async (album: SearchAlbum) => {
    const albumId = album.browseId || `album-${album.title}`;
    if (!user || savingAlbums.has(albumId)) return;

    const isLiked = likedAlbums.has(albumId);
    setSavingAlbums((prev) => new Set(prev).add(albumId));

    try {
      // Get tracks if not already loaded
      let tracks = getAlbumTracks(album);
      if (tracks.length === 0 && album.browseId) {
        const response = await fetch(`${API_BASE_URL}/api/album/${album.browseId}`);
        if (response.ok) {
          const data = await response.json();
          tracks = data.album?.tracks || [];
        }
      }

      if (isLiked) {
        // Remove all tracks
        for (const track of tracks) {
          if (track.videoId && likedSongs.has(track.videoId)) {
            await supabase
              .from('playlists')
              .delete()
              .eq('user_id', user.id)
              .eq('video_id', track.videoId);
            setLikedSongs((prev) => {
              const next = new Set(prev);
              next.delete(track.videoId);
              return next;
            });
          }
        }
        setLikedAlbums((prev) => {
          const next = new Set(prev);
          next.delete(albumId);
          return next;
        });
      } else {
        // Add all tracks
        for (const track of tracks) {
          if (track.videoId && !likedSongs.has(track.videoId)) {
            await supabase.from('playlists').insert({
              user_id: user.id,
              title: track.title,
              video_id: track.videoId,
              cover_url: getBestThumbnail(track.thumbnails || album.thumbnails),
              is_public: true,
            });
            setLikedSongs((prev) => new Set(prev).add(track.videoId));
          }
        }
        setLikedAlbums((prev) => new Set(prev).add(albumId));
      }
    } catch {
      // Error toggling album like
    } finally {
      setSavingAlbums((prev) => {
        const next = new Set(prev);
        next.delete(albumId);
        return next;
      });
    }
  };

  const hasResults = searchArtist || searchSongs.length > 0 || searchAlbums.length > 0;
  const hasUserResults = userResults.length > 0;
  const isLoading = activeTab === 'music' ? searchLoading : userSearchLoading;

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800">
        {/* Search Input */}
        <div className="flex gap-2 px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                activeTab === 'music' ? t('search.placeholder') : t('search.searchUsers')
              }
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
            onClick={handleSearchClick}
            disabled={searchQuery.trim().length < 2 || isLoading}
            className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={t('search.search')}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('music')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
              activeTab === 'music'
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Music size={18} />
            {t('search.music')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
              activeTab === 'users'
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users size={18} />
            {t('search.users')}
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div className="p-4">
        {/* User Search Results */}
        {activeTab === 'users' && (
          <>
            {userSearchLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-gray-500" />
              </div>
            ) : hasUserResults ? (
              <div className="space-y-2">
                {userResults.map((profile) => (
                  <button
                    type="button"
                    key={profile.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer w-full text-left"
                    onClick={() => navigate(`/profile/${profile.id}`)}
                  >
                    <img
                      src={profile.avatar_url || DEFAULT_AVATAR}
                      alt={profile.username}
                      className="w-14 h-14 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black dark:text-white truncate">
                        {profile.username}
                      </p>
                      {profile.full_name && (
                        <p className="text-sm text-gray-500 truncate">{profile.full_name}</p>
                      )}
                      {profile.bio && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{profile.bio}</p>
                      )}
                    </div>
                    <FollowButton userId={profile.id} size="sm" />
                  </button>
                ))}
              </div>
            ) : suggestedLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-gray-500" />
              </div>
            ) : suggestedUsers.length > 0 || newUsers.length > 0 ? (
              <div className="space-y-6">
                {/* Popular Users */}
                {suggestedUsers.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold mb-3 text-black dark:text-white flex items-center gap-2">
                      {t('search.suggestedForYou')}
                    </h3>
                    <div className="space-y-2">
                      {suggestedUsers.map((profile) => (
                        <button
                          type="button"
                          key={profile.id}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer w-full text-left"
                          onClick={() => navigate(`/profile/${profile.id}`)}
                        >
                          <img
                            src={profile.avatar_url || DEFAULT_AVATAR}
                            alt={profile.username || profile.full_name || 'User'}
                            className="w-14 h-14 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-black dark:text-white truncate">
                              {profile.username || profile.full_name || 'User'}
                            </p>
                            {profile.username && profile.full_name && (
                              <p className="text-sm text-gray-500 truncate">{profile.full_name}</p>
                            )}
                            {profile.followers_count !== undefined &&
                              profile.followers_count > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {profile.followers_count} {t('common.followers')}
                                </p>
                              )}
                          </div>
                          <FollowButton userId={profile.id} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Users */}
                {newUsers.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                      {t('search.newToSori')}
                    </h3>
                    <div className="space-y-2">
                      {newUsers.map((profile) => (
                        <button
                          type="button"
                          key={profile.id}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition cursor-pointer w-full text-left"
                          onClick={() => navigate(`/profile/${profile.id}`)}
                        >
                          <img
                            src={profile.avatar_url || DEFAULT_AVATAR}
                            alt={profile.username || profile.full_name || 'User'}
                            className="w-14 h-14 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-black dark:text-white truncate">
                              {profile.username || profile.full_name || 'User'}
                            </p>
                            {profile.username && profile.full_name && (
                              <p className="text-sm text-gray-500 truncate">{profile.full_name}</p>
                            )}
                          </div>
                          <FollowButton userId={profile.id} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('search.searchForUsers')}</p>
                <p className="text-sm mt-2 text-gray-400">{t('search.findPeople')}</p>
              </div>
            )}
          </>
        )}

        {/* Music Search Results */}
        {activeTab === 'music' && (
          <>
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
                        <p className="text-sm text-gray-500">
                          {searchArtist.subscribers || 'Artist'}
                        </p>
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
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          <button
                            type="button"
                            onClick={() => handlePlayTrackFromSearch(song, i)}
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
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
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLike(song)}
                            className={`p-1.5 cursor-pointer bg-transparent border-0 ${likedSongs.has(song.videoId) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                          >
                            <Heart
                              size={16}
                              fill={likedSongs.has(song.videoId) ? 'currentColor' : 'none'}
                            />
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
                            {t('search.allSongs')}
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
                            <span className="text-sm text-gray-500">
                              {t('search.loadingTracks')}
                            </span>
                          </div>
                        ) : allSongsTracks.length > 0 ? (
                          <div>
                            {allSongsTracks.map((song, i) => (
                              <div
                                key={song.videoId || i}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                              >
                                <button
                                  type="button"
                                  onClick={() => handlePlayAllSongsTrack(song, i)}
                                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
                                >
                                  <span className="w-6 text-center text-sm text-gray-400">
                                    {i + 1}
                                  </span>
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
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLike(song)}
                                  className={`p-1.5 cursor-pointer bg-transparent border-0 ${likedSongs.has(song.videoId) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                                >
                                  <Heart
                                    size={16}
                                    fill={likedSongs.has(song.videoId) ? 'currentColor' : 'none'}
                                  />
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
                            <div className="flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                              <button
                                type="button"
                                onClick={() => handleShowAlbumPanel(album)}
                                className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
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
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAlbumLike(album)}
                                className={`p-2 flex-shrink-0 cursor-pointer bg-transparent border-0 ${likedAlbums.has(albumId) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                              >
                                {savingAlbums.has(albumId) ? (
                                  <Loader2 size={20} className="animate-spin" />
                                ) : (
                                  <Heart
                                    size={20}
                                    fill={likedAlbums.has(albumId) ? 'currentColor' : 'none'}
                                  />
                                )}
                              </button>
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
                                      className="flex items-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 -mx-2"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handlePlayAlbumTrack(album, trackIdx)}
                                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
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
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleLike(track, album.thumbnails)}
                                        className={`p-1 cursor-pointer bg-transparent border-0 ${likedSongs.has(track.videoId) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                                      >
                                        <Heart
                                          size={14}
                                          fill={
                                            likedSongs.has(track.videoId) ? 'currentColor' : 'none'
                                          }
                                        />
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
                        const artistName =
                          artist.name || artist.artist || artist.title || 'Unknown';
                        return (
                          <button
                            type="button"
                            key={artist.browseId || `related-${i}`}
                            onClick={() => handleSearchSimilarArtist(artistName)}
                            className="flex flex-col items-center cursor-pointer group bg-transparent border-0 p-0"
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
                          </button>
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
          </>
        )}
      </div>
    </div>
  );
}
