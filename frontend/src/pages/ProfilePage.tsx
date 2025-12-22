import { useEffect, useState, SyntheticEvent, MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Settings,
  UserPlus,
  Plus,
} from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import useCountry from '../hooks/useCountry';
import { supabase } from '../lib/supabase';
import FollowersModal from '../components/social/FollowersModal';
import FollowButton from '../components/social/FollowButton';
import { DEFAULT_AVATAR } from '../components/common';

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

interface StatItemProps {
  readonly count: number;
  readonly label: string;
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
  readonly track: LikedTrack;
  readonly index: number;
  readonly onPlay: (track: LikedTrack, index: number) => void;
  readonly onDelete?: (track: LikedTrack) => void;
  readonly isPlaying: boolean;
  readonly isCurrentTrack: boolean;
}

// Track Item Component for Your Music list
function TrackItem({ track, index, onPlay, onDelete, isPlaying, isCurrentTrack }: TrackItemProps) {
  const { t } = useTranslation();
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
        <div className="text-xs text-gray-500 truncate">
          {track.artist || t('common.unknownArtist', 'Unknown Artist')}
        </div>
      </div>

      {/* Delete Button (on hover) */}
      {showDelete && onDelete && (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onDelete(track);
          }}
          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title={t('profile.removeFromLiked', 'Remove from liked')}
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
  followers_count?: number;
  following_count?: number;
}

interface Playlist {
  id: string;
  title?: string;
  video_id?: string;
  cover_url?: string;
  is_public?: boolean;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  artist?: string;
  video_id?: string;
  cover_url?: string;
  caption?: string;
  like_count?: number;
  comment_count?: number;
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

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user, signOut } = useAuthStore();
  const { setTrack, startPlayback, currentTrack, isPlaying, openTrackPanel, setTrackPanelLoading } =
    usePlayerStore();
  const country = useCountry();

  // Determine if viewing own profile or another user's
  const isOwnProfile = !paramUserId || paramUserId === user?.id;
  const targetUserId = isOwnProfile ? user?.id : paramUserId;

  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'discover' | 'private'>(
    isOwnProfile ? 'discover' : 'posts'
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<LikedTrack[]>([]);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [homeLoading, setHomeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingConversation, setStartingConversation] = useState(false);

  // Follow modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      if (!targetUserId) return;

      try {
        setLoading(true);

        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData as Profile);

        // 2. Fetch User's Posts (public feed posts)
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (!postsError) {
          setPosts((postsData as Post[]) || []);
        }

        // 3. Fetch User's Playlists (for other uses)
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (playlistError) throw playlistError;
        setPlaylists((playlistData as Playlist[]) || []);

        // 4. Fetch Liked Songs (using playlists with video_id as liked songs for now)
        // Only show for own profile
        if (isOwnProfile) {
          const likedData: LikedTrack[] = ((playlistData as Playlist[]) || [])
            .filter((p) => p.video_id)
            .map((p) => ({
              videoId: p.video_id as string,
              title: p.title || t('common.unknown', 'Unknown'),
              artist: (profileData as Profile)?.username || t('profile.you', 'You'),
              thumbnail: p.cover_url,
              cover: p.cover_url,
              playlistId: p.id,
            }));
          setLikedSongs(likedData);
        }
      } catch {
        // Error fetching profile
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [targetUserId, isOwnProfile]);

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
  const getBestThumbnail = (
    thumbnails?: Array<{ url: string; width?: number; height?: number }>
  ) => {
    if (!thumbnails || thumbnails.length === 0) return null;
    return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
  };

  // Fetch playlist data and show panel
  const fetchAndShowPlaylist = async (playlistId: string) => {
    setTrackPanelLoading(true);
    openTrackPanel({
      title: t('common.loading'),
      tracks: [],
      trackCount: 0,
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/playlist/${playlistId}?country=${country.code}`
      );
      if (response.ok) {
        const data = await response.json();
        const playlist = data.playlist;
        openTrackPanel({
          title: playlist.title || t('profile.playlist'),
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
      setTrackPanelLoading(false);
    }
  };

  // Fetch album data and show panel
  const fetchAndShowAlbum = async (browseId: string) => {
    setTrackPanelLoading(true);
    openTrackPanel({
      title: t('common.loading'),
      tracks: [],
      trackCount: 0,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/album/${browseId}?country=${country.code}`);
      if (response.ok) {
        const data = await response.json();
        const album = data.album;
        openTrackPanel({
          title: album.title || t('profile.album', 'Album'),
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
      setTrackPanelLoading(false);
    }
  };

  // Play a home content item (song, playlist, or album) - opens popup with section tracks
  const handlePlayHomeItem = (item: HomeContentItem, section: HomeSection, itemIndex: number) => {
    // If it's a direct video, open popup with ALL video tracks from the section
    if (item.videoId) {
      // Get all video tracks from this section
      const sectionVideoTracks = section.contents.filter((c) => c.videoId);
      const panelTracks: PlaylistTrackData[] = sectionVideoTracks.map((c) => ({
        videoId: c.videoId as string,
        title: c.title,
        artists:
          c.artists ||
          (c.subtitle ? [{ name: c.subtitle }] : [{ name: t('common.unknown', 'Unknown') }]),
        thumbnails: c.thumbnails,
      }));

      openTrackPanel({
        title: section.title,
        author: { name: `${sectionVideoTracks.length} ${t('profile.tracks')}` },
        tracks: panelTracks,
        trackCount: sectionVideoTracks.length,
      });

      // Find the correct index in filtered video tracks
      const videoTrackIndex = sectionVideoTracks.findIndex((c) => c.videoId === item.videoId);
      const tracks = sectionVideoTracks.map((c) => ({
        videoId: c.videoId as string,
        title: c.title,
        artist:
          c.artists?.map((a) => a.name).join(', ') || c.subtitle || t('common.unknown', 'Unknown'),
        thumbnail: getBestThumbnail(c.thumbnails) || undefined,
      }));
      startPlayback(tracks, videoTrackIndex >= 0 ? videoTrackIndex : 0);
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

  // Play a single post - opens popup
  const handlePlayPost = (post: Post) => {
    if (!post.video_id) return;

    const panelTrack: PlaylistTrackData = {
      videoId: post.video_id,
      title: post.title || t('common.unknown', 'Unknown'),
      artists: post.artist
        ? [{ name: post.artist }]
        : [{ name: t('common.unknownArtist', 'Unknown Artist') }],
      thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
    };
    openTrackPanel({
      title: post.title || t('profile.track', 'Track'),
      author: { name: post.artist || profile?.username || t('profile.you', 'You') },
      thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
      tracks: [panelTrack],
      trackCount: 1,
    });

    const track = {
      videoId: post.video_id,
      title: post.title || t('common.unknown', 'Unknown'),
      artist: post.artist || t('common.unknownArtist', 'Unknown Artist'),
      thumbnail: post.cover_url,
      cover: post.cover_url,
    };

    setTrack(track);
  };

  // Play a single playlist - opens popup
  const handlePlayPlaylist = (playlist: Playlist) => {
    if (!playlist.video_id) return;

    const panelTrack: PlaylistTrackData = {
      videoId: playlist.video_id,
      title: playlist.title || t('profile.playlist'),
      artists: [{ name: profile?.username || t('profile.you', 'You') }],
      thumbnails: playlist.cover_url ? [{ url: playlist.cover_url }] : undefined,
    };
    openTrackPanel({
      title: playlist.title || t('profile.playlist'),
      author: { name: profile?.username || t('profile.you', 'You') },
      thumbnails: playlist.cover_url ? [{ url: playlist.cover_url }] : undefined,
      tracks: [panelTrack],
      trackCount: 1,
    });

    const track = {
      videoId: playlist.video_id,
      title: playlist.title || t('profile.playlist'),
      artist: profile?.username || t('profile.you', 'You'),
      thumbnail: playlist.cover_url,
      cover: playlist.cover_url,
    };

    setTrack(track);
  };

  // Play a track from liked songs - opens popup
  const handlePlayTrack = (track: LikedTrack, index: number) => {
    if (likedSongs.length > 0) {
      // Open popup with liked songs list
      const panelTracks: PlaylistTrackData[] = likedSongs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artists: [{ name: s.artist || t('common.unknownArtist', 'Unknown Artist') }],
        thumbnails: s.thumbnail ? [{ url: s.thumbnail }] : undefined,
      }));
      openTrackPanel({
        title: t('profile.yourMusic'),
        author: { name: `${likedSongs.length} ${t('profile.songs')}` },
        tracks: panelTracks,
        trackCount: likedSongs.length,
      });

      // Start playback
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

  // Shuffle play all liked songs - opens popup
  const handleShufflePlay = () => {
    if (likedSongs.length === 0) return;

    // Open popup with liked songs list
    const panelTracks: PlaylistTrackData[] = likedSongs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artists: [{ name: s.artist || t('common.unknownArtist', 'Unknown Artist') }],
      thumbnails: s.thumbnail ? [{ url: s.thumbnail }] : undefined,
    }));
    openTrackPanel({
      title: t('profile.yourMusic'),
      author: { name: `${likedSongs.length} ${t('profile.songs')}` },
      tracks: panelTracks,
      trackCount: likedSongs.length,
    });

    // Start shuffled playback
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

  // Start or find existing conversation with this user
  const handleStartConversation = async () => {
    if (!user?.id || !targetUserId || isOwnProfile || startingConversation) return;

    setStartingConversation(true);
    try {
      // Check if conversation already exists between these users
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingParticipations && existingParticipations.length > 0) {
        const conversationIds = existingParticipations.map((p) => p.conversation_id);

        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', conversationIds);

        if (otherParticipations && otherParticipations.length > 0) {
          // Existing conversation found
          navigate(`/messages/${otherParticipations[0].conversation_id}`);
          return;
        }
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single();

      if (convError) throw convError;

      // Add both participants
      const { error: participantsError } = await supabase.from('conversation_participants').insert([
        { conversation_id: newConversation.id, user_id: user.id },
        { conversation_id: newConversation.id, user_id: targetUserId },
      ]);

      if (participantsError) throw participantsError;

      // Navigate to the new conversation
      navigate(`/messages/${newConversation.id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setStartingConversation(false);
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
                  (isOwnProfile ? user?.user_metadata?.avatar_url : null) ||
                  DEFAULT_AVATAR
                }
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-around ml-4">
            <StatItem count={posts.length} label={t('profile.posts')} />
            <button onClick={() => setShowFollowersModal(true)} className="text-center">
              <StatItem count={profile?.followers_count || 0} label={t('common.followers')} />
            </button>
            <button onClick={() => setShowFollowingModal(true)} className="text-center">
              <StatItem count={profile?.following_count || 0} label={t('common.following')} />
            </button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4">
          <h2 className="font-bold text-sm">
            {profile?.full_name ||
              (isOwnProfile ? user?.user_metadata?.full_name : null) ||
              t('profile.noName')}
          </h2>
          <span className="text-xs text-gray-500 block mb-1">
            @{profile?.username || 'username'}
          </span>
          <p className="text-sm whitespace-pre-line">
            {profile?.website || t('profile.musicIsLife')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {t('profile.editProfile')}
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title={t('profile.settings', 'Settings')}
              >
                <Settings size={18} />
              </button>
              <button
                onClick={signOut}
                className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-red-500"
                title={t('profile.signOut')}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              {/* Instagram-style Follow button with dropdown */}
              <FollowButton userId={targetUserId!} size="md" className="flex-1" showDropdown />
              {/* Message button */}
              <button
                onClick={handleStartConversation}
                disabled={startingConversation}
                className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center disabled:opacity-50"
              >
                {t('profile.message')}
              </button>
              {/* User suggestion button */}
              <button
                className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title={t('profile.suggestedUsers', 'Suggested users')}
              >
                <UserPlus size={18} />
              </button>
            </>
          )}
        </div>

        {/* Story Highlights Section - Instagram style */}
        <div className="mt-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2">
            {/* Add New Highlight button (only for own profile) */}
            {isOwnProfile && (
              <div className="flex flex-col items-center flex-shrink-0">
                <button className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-gray-400 dark:hover:border-gray-500 transition">
                  <Plus size={24} className="text-gray-400" />
                </button>
                <span className="text-xs mt-1 text-gray-600 dark:text-gray-400 truncate w-16 text-center">
                  {t('profile.new')}
                </span>
              </div>
            )}
            {/* Highlight items - Show user's playlists as highlights */}
            {playlists.slice(0, 8).map((playlist) => (
              <div
                key={playlist.id}
                role="button"
                tabIndex={0}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                onClick={() => playlist.video_id && handlePlayPlaylist(playlist)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && playlist.video_id) {
                    e.preventDefault();
                    handlePlayPlaylist(playlist);
                  }
                }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-600 p-0.5">
                  <img
                    src={
                      playlist.cover_url ||
                      (playlist.video_id
                        ? `https://i.ytimg.com/vi/${playlist.video_id}/default.jpg`
                        : 'https://via.placeholder.com/64')
                    }
                    alt={playlist.title || t('profile.playlist')}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <span className="text-xs mt-1 text-gray-800 dark:text-gray-200 truncate w-16 text-center">
                  {playlist.title?.slice(0, 10) || t('profile.playlist')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'posts' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Grid size={24} />
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'liked' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Heart size={24} />
          </button>
        )}
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'discover' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Disc size={24} />
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('private')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'private' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Lock size={24} />
          </button>
        )}
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
      ) : activeTab === 'posts' ? (
        // Posts Grid Tab
        <div className="grid grid-cols-3 gap-0.5">
          {posts.length > 0 ? (
            posts.map((post) => {
              const isCurrentlyPlaying = currentTrack?.videoId === post.video_id && isPlaying;
              return (
                <div
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePlayPost(post)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePlayPost(post);
                    }
                  }}
                  className="aspect-square relative group bg-gray-100 cursor-pointer"
                >
                  <img
                    src={
                      post.cover_url ||
                      (post.video_id
                        ? `https://i.ytimg.com/vi/${post.video_id}/hqdefault.jpg`
                        : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop')
                    }
                    alt={post.title}
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
                      {post.title}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 py-10 text-center text-gray-500 text-sm">
              {t('profile.noPostsYet')}
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
                      onClick={() => handlePlayHomeItem(item, section, itemIndex)}
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

      {/* Followers/Following Modals */}
      {profile?.id && (
        <>
          <FollowersModal
            userId={profile.id}
            type="followers"
            isOpen={showFollowersModal}
            onClose={() => setShowFollowersModal(false)}
          />
          <FollowersModal
            userId={profile.id}
            type="following"
            isOpen={showFollowingModal}
            onClose={() => setShowFollowingModal(false)}
          />
        </>
      )}
    </div>
  );
}
