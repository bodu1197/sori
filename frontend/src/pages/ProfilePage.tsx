import { useEffect, useState, SyntheticEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Grid,
  Heart,
  Lock,
  Play,
  LogOut,
  Music,
  Shuffle,
  Trash2,
  Disc,
  X,
  ChevronRight,
} from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore from '../stores/usePlayerStore';
import useCountry from '../hooks/useCountry';
import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

interface StatItemProps {
  count: number;
  label: string;
}

function StatItem({ count, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold text-lg leading-tight">{count}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  );
}

interface LikedTrack {
  videoId: string;
  title: string;
  artist: string;
  thumbnail?: string;
  cover?: string;
  cover_url?: string;
  playlistId: string;
}

interface TrackItemProps {
  track: LikedTrack;
  index: number;
  onPlay: (track: LikedTrack, index: number) => void;
  onDelete?: (track: LikedTrack) => void;
  isPlaying: boolean;
  isCurrentTrack: boolean;
}

// Track Item Component for Your Music list
function TrackItem({ track, index, onPlay, onDelete, isPlaying, isCurrentTrack }: TrackItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      onClick={() => onPlay(track, index)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isCurrentTrack ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
    >
      {/* Thumbnail with play indicator */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <img
          src={track.thumbnail || track.cover_url}
          alt={track.title}
          className="w-full h-full rounded object-cover"
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
          }}
        />
        {isCurrentTrack && isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
            <div className="flex gap-0.5">
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <div
          className={`font-medium text-sm truncate ${isCurrentTrack ? 'text-black dark:text-white' : ''}`}
        >
          {track.title}
        </div>
        <div className="text-xs text-gray-500 truncate">{track.artist || 'Unknown Artist'}</div>
      </div>

      {/* Delete Button (on hover) */}
      {showDelete && onDelete && (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onDelete(track);
          }}
          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title="Remove from liked"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Play Button */}
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onPlay(track, index);
        }}
        className="p-2 text-gray-500 hover:text-black dark:hover:text-white"
      >
        {isCurrentTrack && isPlaying ? (
          <Music size={18} className="text-black dark:text-white" />
        ) : (
          <Play size={18} fill="currentColor" />
        )}
      </button>
    </div>
  );
}

interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
}

interface Playlist {
  id: string;
  title?: string;
  video_id?: string;
  cover_url?: string;
  is_public?: boolean;
  created_at: string;
}

interface HomeContentItem {
  title: string;
  videoId?: string;
  playlistId?: string;
  browseId?: string;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  artists?: Array<{ name: string; id?: string }>;
  views?: string;
  album?: { name: string; id: string };
  subtitle?: string;
}

interface HomeSection {
  title: string;
  contents: HomeContentItem[];
}

interface HomeData {
  sections: HomeSection[];
}

interface PlaylistTrack {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  duration?: string;
  album?: { name: string; id?: string };
  isAvailable?: boolean;
}

interface PlaylistData {
  title: string;
  description?: string;
  author?: { name: string };
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  tracks: PlaylistTrack[];
  trackCount?: number;
}

interface PlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistData | null;
  loading: boolean;
  onPlayTrack: (track: PlaylistTrack, index: number, allTracks: PlaylistTrack[]) => void;
  onPlayAll: () => void;
  onShuffleAll: () => void;
  currentVideoId?: string;
  isPlaying: boolean;
}

function PlaylistPanel({
  isOpen,
  onClose,
  playlist,
  loading,
  onPlayTrack,
  onPlayAll,
  onShuffleAll,
  currentVideoId,
  isPlaying,
}: PlaylistPanelProps) {
  const getBestThumbnail = (thumbnails?: Array<{ url: string; width: number; height: number }>) => {
    if (!thumbnails || thumbnails.length === 0) return null;
    return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
  };

  // Find current playing track info
  const currentTrackInfo = playlist?.tracks.find((t) => t.videoId === currentVideoId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl h-[100dvh] overflow-hidden animate-slide-up">
        {/* YouTube Video Player - YouTube iframe API compliance */}
        {currentVideoId && (
          <div className="w-full bg-black">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {/* Current Track Info */}
            {currentTrackInfo && (
              <div className="px-4 py-2 bg-gray-900 text-white">
                <div className="font-medium text-sm truncate">{currentTrackInfo.title}</div>
                <div className="text-xs text-gray-400 truncate">
                  {currentTrackInfo.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {playlist?.thumbnails && (
                <img
                  src={getBestThumbnail(playlist.thumbnails) || 'https://via.placeholder.com/48'}
                  alt={playlist?.title || 'Playlist'}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate">{playlist?.title || 'Loading...'}</h3>
                <p className="text-sm text-gray-500 truncate">
                  {playlist?.author?.name || ''}{' '}
                  {playlist?.trackCount ? `${playlist.trackCount} tracks` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X size={24} />
            </button>
          </div>

          {/* Play Controls */}
          {playlist && playlist.tracks.length > 0 && (
            <div className="flex gap-2 px-4 pb-3">
              <button
                onClick={onPlayAll}
                className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-full font-semibold hover:opacity-80 transition"
              >
                <Play size={18} fill="currentColor" /> Play All
              </button>
              <button
                onClick={onShuffleAll}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 py-2.5 rounded-full font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <Shuffle size={18} /> Shuffle
              </button>
            </div>
          )}
        </div>

        {/* Track List */}
        <div
          className="overflow-y-auto flex-1"
          style={{ maxHeight: currentVideoId ? 'calc(100dvh - 380px)' : 'calc(100dvh - 160px)' }}
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
            </div>
          ) : playlist && playlist.tracks.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {playlist.tracks.map((track, index) => {
                const isCurrentTrack = currentVideoId === track.videoId;
                const isTrackPlaying = isCurrentTrack && isPlaying;

                return (
                  <div
                    key={track.videoId || index}
                    onClick={() => track.videoId && onPlayTrack(track, index, playlist.tracks)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      isCurrentTrack
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${!track.videoId || track.isAvailable === false ? 'opacity-50' : ''}`}
                  >
                    {/* Index / Playing Indicator */}
                    <div className="w-6 flex-shrink-0 text-center">
                      {isTrackPlaying ? (
                        <div className="flex gap-0.5 justify-center">
                          <div
                            className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">{index + 1}</span>
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-10 h-10 flex-shrink-0">
                      <img
                        src={getBestThumbnail(track.thumbnails) || 'https://via.placeholder.com/40'}
                        alt={track.title}
                        className="w-full h-full rounded object-cover"
                      />
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium text-sm truncate ${isCurrentTrack ? 'text-black dark:text-white' : ''}`}
                      >
                        {track.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {track.duration || ''}
                    </div>

                    {/* Play Button */}
                    <button className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500">No tracks available</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const { setTrack, startPlayback, currentTrack, isPlaying } = usePlayerStore();
  const country = useCountry();

  const [activeTab, setActiveTab] = useState<'playlists' | 'liked' | 'discover' | 'private'>(
    'playlists'
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<LikedTrack[]>([]);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [homeLoading, setHomeLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Playlist Panel State
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;

      try {
        setLoading(true);

        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData as Profile);

        // 2. Fetch User's Playlists
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (playlistError) throw playlistError;
        setPlaylists((playlistData as Playlist[]) || []);

        // 3. Fetch Liked Songs (using playlists with video_id as liked songs for now)
        const likedData: LikedTrack[] = ((playlistData as Playlist[]) || [])
          .filter((p) => p.video_id)
          .map((p) => ({
            videoId: p.video_id as string,
            title: p.title || 'Unknown',
            artist: (profileData as Profile)?.username || 'You',
            thumbnail: p.cover_url,
            cover: p.cover_url,
            playlistId: p.id,
          }));
        setLikedSongs(likedData);
      } catch {
        // Error fetching profile
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [user]);

  // Fetch home data when discover tab is active
  useEffect(() => {
    async function fetchHomeData() {
      if (activeTab !== 'discover' || homeData) return;

      setHomeLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/home?country=${country.code}&limit=6`);
        if (response.ok) {
          const data = await response.json();
          setHomeData(data);
        }
      } catch {
        // Error fetching home data
      } finally {
        setHomeLoading(false);
      }
    }

    fetchHomeData();
  }, [activeTab, country.code, homeData]);

  // Helper to get best thumbnail
  const getBestThumbnail = (thumbnails?: Array<{ url: string; width: number; height: number }>) => {
    if (!thumbnails || thumbnails.length === 0) return null;
    return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
  };

  // Fetch playlist data and show panel
  const fetchAndShowPlaylist = async (playlistId: string) => {
    setPlaylistPanelOpen(true);
    setPlaylistLoading(true);
    setPlaylistData(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/playlist/${playlistId}?country=${country.code}`
      );
      if (response.ok) {
        const data = await response.json();
        const playlist = data.playlist;
        setPlaylistData({
          title: playlist.title || 'Playlist',
          description: playlist.description,
          author: playlist.author,
          thumbnails: playlist.thumbnails,
          tracks: playlist.tracks || [],
          trackCount: playlist.trackCount || playlist.tracks?.length || 0,
        });
      }
    } catch {
      // Error fetching playlist
    } finally {
      setPlaylistLoading(false);
    }
  };

  // Fetch album data and show panel
  const fetchAndShowAlbum = async (browseId: string) => {
    setPlaylistPanelOpen(true);
    setPlaylistLoading(true);
    setPlaylistData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/album/${browseId}?country=${country.code}`);
      if (response.ok) {
        const data = await response.json();
        const album = data.album;
        setPlaylistData({
          title: album.title || 'Album',
          description: album.description,
          author: { name: album.artists?.map((a: { name: string }) => a.name).join(', ') || '' },
          thumbnails: album.thumbnails,
          tracks: album.tracks || [],
          trackCount: album.trackCount || album.tracks?.length || 0,
        });
      }
    } catch {
      // Error fetching album
    } finally {
      setPlaylistLoading(false);
    }
  };

  // Play a home content item (song, playlist, or album)
  const handlePlayHomeItem = (item: HomeContentItem) => {
    // If it's a direct video, play it
    if (item.videoId) {
      const track = {
        videoId: item.videoId,
        title: item.title,
        artist: item.artists?.map((a) => a.name).join(', ') || item.subtitle || 'Unknown',
        thumbnail: getBestThumbnail(item.thumbnails) || undefined,
      };
      setTrack(track);
      return;
    }

    // If it's a playlist, fetch and show
    if (item.playlistId) {
      fetchAndShowPlaylist(item.playlistId);
      return;
    }

    // If it's an album/browse item, fetch and show
    if (item.browseId) {
      fetchAndShowAlbum(item.browseId);
      return;
    }
  };

  // Play a track from playlist panel
  const handlePlayPanelTrack = (
    track: PlaylistTrack,
    index: number,
    allTracks: PlaylistTrack[]
  ) => {
    const tracks = allTracks
      .filter((t) => t.videoId)
      .map((t) => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown',
        thumbnail: getBestThumbnail(t.thumbnails) || undefined,
      }));

    const trackIndex = tracks.findIndex((t) => t.videoId === track.videoId);
    if (trackIndex !== -1 && tracks.length > 0) {
      startPlayback(tracks, trackIndex);
    }
  };

  // Play all tracks from playlist panel
  const handlePlayAllPanelTracks = () => {
    if (!playlistData || playlistData.tracks.length === 0) return;

    const tracks = playlistData.tracks
      .filter((t) => t.videoId)
      .map((t) => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown',
        thumbnail: getBestThumbnail(t.thumbnails) || undefined,
      }));

    if (tracks.length > 0) {
      startPlayback(tracks, 0);
    }
  };

  // Shuffle all tracks from playlist panel
  const handleShuffleAllPanelTracks = () => {
    if (!playlistData || playlistData.tracks.length === 0) return;

    const tracks = playlistData.tracks
      .filter((t) => t.videoId)
      .map((t) => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown',
        thumbnail: getBestThumbnail(t.thumbnails) || undefined,
      }));

    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    if (shuffled.length > 0) {
      startPlayback(shuffled, 0);
    }
  };

  // Play a single playlist
  const handlePlayPlaylist = (playlist: Playlist) => {
    if (!playlist.video_id) return;

    const track = {
      videoId: playlist.video_id,
      title: playlist.title || 'Unknown Playlist',
      artist: profile?.username || 'You',
      thumbnail: playlist.cover_url,
      cover: playlist.cover_url,
    };

    setTrack(track);
  };

  // Play a track from liked songs
  const handlePlayTrack = (track: LikedTrack, index: number) => {
    if (likedSongs.length > 0) {
      const tracks = likedSongs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        cover: s.cover,
      }));
      startPlayback(tracks, index);
    } else {
      setTrack(track);
    }
  };

  // Shuffle play all liked songs
  const handleShufflePlay = () => {
    if (likedSongs.length === 0) return;

    const tracks = likedSongs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      cover: s.cover,
    }));

    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Delete a liked song
  const handleDeleteSong = async (track: LikedTrack) => {
    if (!track.playlistId) return;

    try {
      const { error } = await supabase.from('playlists').delete().eq('id', track.playlistId);

      if (error) throw error;

      setLikedSongs((prev) => prev.filter((s) => s.playlistId !== track.playlistId));
      setPlaylists((prev) => prev.filter((p) => p.id !== track.playlistId));
    } catch {
      // Error deleting song
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">{t('common.loading')}</div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      <div className="px-4 pt-4 pb-4">
        {/* Top Section: Avatar + Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-gray-200 to-gray-200">
              <img
                src={
                  profile?.avatar_url ||
                  user?.user_metadata?.avatar_url ||
                  'https://via.placeholder.com/150'
                }
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-around ml-4">
            <StatItem count={playlists.length} label={t('profile.playlists')} />
            <StatItem count={likedSongs.length} label={t('profile.liked')} />
            <StatItem count={0} label={t('profile.following')} />
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4">
          <h2 className="font-bold text-sm">
            {profile?.full_name || user?.user_metadata?.full_name || 'No Name'}
          </h2>
          <span className="text-xs text-gray-500 block mb-1">
            @{profile?.username || 'username'}
          </span>
          <p className="text-sm whitespace-pre-line">{profile?.website || 'Music is life'}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            {t('profile.editProfile')}
          </button>
          <button
            onClick={signOut}
            className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-red-500"
          >
            <LogOut size={16} /> {t('profile.signOut')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'playlists' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Grid size={24} />
        </button>
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'liked' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Heart size={24} />
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'discover' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Disc size={24} />
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'private' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Lock size={24} />
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'liked' ? (
        // Your Music (Liked Songs) Tab
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">{t('profile.yourMusic')}</h3>
              <p className="text-xs text-gray-500">
                {likedSongs.length} {t('profile.songs')}
              </p>
            </div>
            {likedSongs.length > 0 && (
              <button
                onClick={handleShufflePlay}
                className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full text-sm font-semibold hover:opacity-80 transition"
              >
                <Shuffle size={16} />
                {t('profile.shuffle')}
              </button>
            )}
          </div>

          {/* Track List */}
          <div className="space-y-1">
            {likedSongs.length > 0 ? (
              likedSongs.map((track, index) => (
                <TrackItem
                  key={track.playlistId || index}
                  track={track}
                  index={index}
                  onPlay={handlePlayTrack}
                  onDelete={handleDeleteSong}
                  isPlaying={isPlaying}
                  isCurrentTrack={currentTrack?.videoId === track.videoId}
                />
              ))
            ) : (
              <div className="py-10 text-center text-gray-500">
                <Heart size={48} className="mx-auto mb-2 opacity-50" />
                <p>{t('profile.noLikedSongs')}</p>
                <p className="text-sm mt-1">{t('profile.likedSongsHint')}</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'playlists' ? (
        // Playlists Grid Tab
        <div className="grid grid-cols-3 gap-0.5">
          {playlists.length > 0 ? (
            playlists.map((playlist) => {
              const isCurrentlyPlaying = currentTrack?.videoId === playlist.video_id && isPlaying;
              return (
                <div
                  key={playlist.id}
                  onClick={() => handlePlayPlaylist(playlist)}
                  className="aspect-square relative group bg-gray-100 cursor-pointer"
                >
                  <img
                    src={
                      playlist.cover_url ||
                      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
                    }
                    alt="cover"
                    className="w-full h-full object-cover"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                    }}
                  />
                  {/* Overlay */}
                  <div
                    className={`absolute inset-0 transition-opacity ${
                      isCurrentlyPlaying
                        ? 'bg-black/40 opacity-100'
                        : 'bg-black/0 group-hover:bg-black/30 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isCurrentlyPlaying ? (
                        <div className="flex gap-1">
                          <div
                            className="w-1 h-6 bg-white animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          ></div>
                          <div
                            className="w-1 h-6 bg-white animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          ></div>
                          <div
                            className="w-1 h-6 bg-white animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          ></div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play size={20} className="text-white ml-0.5" fill="white" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-white text-xs font-medium line-clamp-1">
                      {playlist.title}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 py-10 text-center text-gray-500 text-sm">
              {t('profile.noPlaylists')}
            </div>
          )}
        </div>
      ) : activeTab === 'discover' ? (
        // Discover Tab - YouTube Music Home Feed
        <div className="p-4 space-y-6">
          {homeLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
            </div>
          ) : homeData?.sections && homeData.sections.length > 0 ? (
            homeData.sections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {/* Section Title */}
                <h3 className="font-bold text-lg mb-3">{section.title}</h3>

                {/* Horizontal Scroll Content */}
                <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
                  {section.contents.slice(0, 12).map((item, itemIndex) => (
                    <div
                      key={item.videoId || item.playlistId || itemIndex}
                      onClick={() => handlePlayHomeItem(item)}
                      className="flex-shrink-0 w-36 cursor-pointer group"
                    >
                      {/* Thumbnail */}
                      <div className="relative">
                        <img
                          src={
                            getBestThumbnail(item.thumbnails) || 'https://via.placeholder.com/144'
                          }
                          alt={item.title}
                          className="w-36 h-36 rounded-lg object-cover shadow-md group-hover:shadow-lg transition-shadow"
                          onError={(e: SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.src = 'https://via.placeholder.com/144';
                          }}
                        />
                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            <Play size={24} className="text-black ml-1" fill="black" />
                          </div>
                        </div>
                        {/* Views Badge */}
                        {item.views && (
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            {item.views}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="mt-2">
                        <div className="font-medium text-sm line-clamp-2 leading-tight">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {item.artists?.map((a) => a.name).join(', ') ||
                            item.subtitle ||
                            item.album?.name ||
                            ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-500">
              <Disc size={48} className="mx-auto mb-2 opacity-50" />
              <p>{t('profile.noRecommendations', 'No recommendations available')}</p>
            </div>
          )}
        </div>
      ) : (
        // Private Tab
        <div className="py-20 text-center text-gray-500">
          <Lock size={48} className="mx-auto mb-2 opacity-50" />
          <p>{t('profile.private')}</p>
        </div>
      )}

      {/* Playlist Panel */}
      <PlaylistPanel
        isOpen={playlistPanelOpen}
        onClose={() => setPlaylistPanelOpen(false)}
        playlist={playlistData}
        loading={playlistLoading}
        onPlayTrack={handlePlayPanelTrack}
        onPlayAll={handlePlayAllPanelTracks}
        onShuffleAll={handleShuffleAllPanelTracks}
        currentVideoId={currentTrack?.videoId}
        isPlaying={isPlaying}
      />
    </div>
  );
}
