import { useEffect, useState, SyntheticEvent, MouseEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
import useContentStore from '../stores/useContentStore';
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
    <button
      type="button"
      onClick={() => onPlay(track, index)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors w-full text-left ${
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
    </button>
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
  artist_browse_id?: string;
  member_type?: string;
}

interface ArtistSong {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  album?: { name: string; id?: string };
  thumbnails?: Array<{ url: string }>;
  duration?: string;
}

interface ArtistAlbum {
  browseId?: string;
  title: string;
  type?: string;
  year?: string;
  thumbnails?: Array<{ url: string }>;
}

interface ArtistVideo {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string }>;
  views?: string;
}

interface SimilarArtist {
  browseId: string;
  artist: string;
  thumbnails?: Array<{ url: string }>;
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

  // activeTab will be set after profile loads for virtual members
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'discover' | 'private' | 'music'>(
    isOwnProfile ? 'discover' : 'music'
  );
  const [userSavedSongs, setUserSavedSongs] = useState<LikedTrack[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<LikedTrack[]>([]);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [homeLoading, setHomeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingConversation, setStartingConversation] = useState(false);

  // Artist music state (for virtual members) - 검색 결과와 동일
  const [artistSongs, setArtistSongs] = useState<ArtistSong[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<ArtistAlbum[]>([]);
  const [artistVideos, setArtistVideos] = useState<ArtistVideo[]>([]);
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [artistMusicLoading, setArtistMusicLoading] = useState(false);
  const [isVirtualMember, setIsVirtualMember] = useState(false);
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  // Follow modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Dynamic recommendations passed from FeedPage
  const location = useLocation();
  const [recommendedTracks, setRecommendedTracks] = useState<PlaylistTrackData[]>([]);
  const [recommendationContext, setRecommendationContext] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (location.state?.recommendedTracks) {
      setRecommendedTracks(location.state.recommendedTracks);
      setRecommendationContext({
        title: location.state.contextTitle,
        message: location.state.contextMessage,
      });
      // Switch to liked tab to show them
      if (isOwnProfile) {
        setActiveTab('liked');
      }
      // Clear state so it doesn't persist on refresh if desired, or keep it.
      // window.history.replaceState({}, document.title); // Optional: clear state
    }
  }, [location.state, isOwnProfile]);

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
        const profileInfo = profileData as Profile;
        setProfile(profileInfo);

        // Check if virtual member (artist)
        const isArtist = profileInfo.member_type === 'artist' && !!profileInfo.artist_browse_id;
        setIsVirtualMember(isArtist);

        // Fetch artist music for virtual members - 검색 페이지와 100% 동일한 데이터
        if (isArtist && profileInfo.full_name) {
          setArtistMusicLoading(true);
          try {
            const searchResponse = await fetch(
              `${API_BASE_URL}/api/search/quick?q=${encodeURIComponent(profileInfo.full_name)}`
            );
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();

              // 검색 결과 전체 저장 (SearchPage와 동일)
              setArtistSongs(searchData.songs || []);
              setArtistAlbums(searchData.albums || []);
              setArtistVideos(searchData.videos || []);
              // similarArtists API 응답을 SimilarArtist 형식으로 변환
              const mappedSimilarArtists = (searchData.similarArtists || []).map(
                (a: { browseId: string; name: string; thumbnail?: string }) => ({
                  browseId: a.browseId,
                  artist: a.name,
                  thumbnails: a.thumbnail ? [{ url: a.thumbnail }] : [],
                })
              );
              setSimilarArtists(mappedSimilarArtists);
            }
          } catch (searchErr) {
            console.error('Error fetching artist music:', searchErr);
          } finally {
            setArtistMusicLoading(false);
          }
        }

        // 2. Fetch User's Posts (public feed posts)
        let postsQuery = supabase
          .from('posts')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        // Security: Only show public posts if viewing someone else's profile
        if (!isOwnProfile) {
          postsQuery = postsQuery.eq('is_public', true);
        }

        const { data: postsData, error: postsError } = await postsQuery;

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
        } else {
          // 5. Fetch other user's music from playlists table (same as own profile)
          const savedData: LikedTrack[] = ((playlistData as Playlist[]) || [])
            .filter((p) => p.video_id)
            .map((p) => ({
              videoId: p.video_id as string,
              title: p.title || t('common.unknown', 'Unknown'),
              artist:
                (profileData as Profile)?.username || t('common.unknownArtist', 'Unknown Artist'),
              thumbnail: p.cover_url,
              cover: p.cover_url,
              cover_url: p.cover_url,
              playlistId: p.id,
            }));
          setUserSavedSongs(savedData);
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

      const {
        homeData: cachedData,
        homeDataLoadedAt,
        setHomeData: setCachedData,
      } = useContentStore.getState();
      const now = Date.now();

      // Use cached data if available and fresh (< 5m)
      if (cachedData && homeDataLoadedAt && now - homeDataLoadedAt < 5 * 60 * 1000) {
        setHomeData(cachedData);
        // console.log('✅ Using Prefetched Profile Data');
        return;
      }

      setHomeLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/home?country=${country.code}&limit=6`);
        if (response.ok) {
          const data = await response.json();
          setHomeData(data);
          // Cache it for future visits
          setCachedData(data);
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
              <FollowButton
                userId={targetUserId!}
                size="md"
                className="flex-1"
                showDropdown
                onFollowChange={(isFollowing) => {
                  setProfile((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      followers_count: Math.max(
                        0,
                        (prev.followers_count || 0) + (isFollowing ? 1 : -1)
                      ),
                    };
                  });
                }}
              />
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
              <button
                type="button"
                key={playlist.id}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                onClick={() => playlist.video_id && handlePlayPlaylist(playlist)}
                disabled={!playlist.video_id}
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
              </button>
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
        {isOwnProfile ? (
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'discover' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Disc size={24} />
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('music')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'music' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Music size={24} />
          </button>
        )}
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
            {/* Dynamic Recommendations Section */}
            {recommendedTracks.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <h4 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                      ✨ {recommendationContext?.title || t('feed.recommended')}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {recommendationContext?.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setRecommendedTracks([])}
                    className="text-xs font-medium text-gray-400 hover:text-black dark:hover:text-white px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    {t('common.clear')}
                  </button>
                </div>

                <div className="space-y-1">
                  {recommendedTracks.map((track, index) => {
                    // Ensure thumbnail is valid
                    const safeThumbnail = track.videoId
                      ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`
                      : track.thumbnails?.[0]?.url || (track as any).thumbnail || '';

                    return (
                      <TrackItem
                        key={`rec-${track.videoId}`}
                        track={{
                          videoId: track.videoId,
                          title: track.title,
                          artist:
                            typeof track.artists?.[0] === 'string'
                              ? track.artists[0]
                              : track.artists?.[0]?.name || (track as any).artist || 'Unknown',
                          thumbnail: safeThumbnail,
                          cover_url: safeThumbnail,
                          playlistId: 'temp-rec', // logical id
                        }}
                        index={index}
                        onPlay={(trackItem, idx) => {
                          // 1. Prepare tracks with safe thumbnails
                          const tracks = recommendedTracks.map((r) => {
                            const thumb = r.videoId
                              ? `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`
                              : r.thumbnails?.[0]?.url || (r as any).thumbnail || '';
                            return {
                              videoId: r.videoId,
                              title: r.title,
                              artist:
                                typeof r.artists?.[0] === 'string'
                                  ? r.artists[0]
                                  : r.artists?.[0]?.name || (r as any).artist || 'Unknown',
                              thumbnail: thumb,
                              cover: thumb,
                              artists: r.artists || [{ name: (r as any).artist || 'Unknown' }],
                            };
                          });

                          // 2. OPEN TRACK PANEL (Popup) - Important for UX & Policy
                          // Transform to PlaylistTrackData specifically for the panel
                          const panelTracks = tracks.map((tr) => ({
                            ...tr,
                            thumbnails: [{ url: tr.thumbnail || '' }],
                          }));

                          openTrackPanel({
                            title: recommendationContext?.title || t('feed.recommended'),
                            author: { name: recommendationContext?.message || 'Sori AI' },
                            tracks: panelTracks,
                            trackCount: panelTracks.length,
                          });

                          // 3. Start Playback
                          startPlayback(tracks, idx);
                        }}
                        isPlaying={isPlaying}
                        isCurrentTrack={currentTrack?.videoId === track.videoId}
                        // No delete button for recommendation items, maybe add 'save' button later
                      />
                    );
                  })}
                </div>
                <div className="my-6 border-t border-gray-100 dark:border-gray-800" />
              </div>
            )}

            {/* Main Liked Songs */}
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
                <button
                  type="button"
                  key={post.id}
                  onClick={() => handlePlayPost(post)}
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
                </button>
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
                    <button
                      type="button"
                      key={item.videoId || item.playlistId || itemIndex}
                      onClick={() => handlePlayHomeItem(item, section, itemIndex)}
                      className="flex-shrink-0 w-36 cursor-pointer group text-left"
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
                    </button>
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
      ) : activeTab === 'music' ? (
        // Artist Music Tab (for virtual members) or Saved Music Tab
        <div className="p-4">
          {isVirtualMember ? (
            // Virtual Member: Show artist's music from search
            <>
              {artistMusicLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Tracks - SearchPage와 동일한 레이아웃 */}
                  {artistSongs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">
                          {t('search.topTracks', 'Top Tracks')} ({artistSongs.length})
                        </h3>
                        <button
                          onClick={() => {
                            const tracks = artistSongs.map((s) => ({
                              videoId: s.videoId,
                              title: s.title,
                              artist: s.artists?.[0]?.name || profile?.full_name || 'Unknown',
                              thumbnail: s.thumbnails?.[0]?.url,
                            }));
                            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                            startPlayback(shuffled, 0);
                          }}
                          className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full text-sm font-semibold hover:opacity-80 transition"
                        >
                          <Shuffle size={16} />
                          {t('profile.shuffle')}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {(showAllSongs ? artistSongs : artistSongs.slice(0, 5)).map(
                          (song, index) => (
                            <button
                              type="button"
                              key={song.videoId || index}
                              onClick={() => {
                                const tracks = artistSongs.map((s) => ({
                                  videoId: s.videoId,
                                  title: s.title,
                                  artist: s.artists?.[0]?.name || profile?.full_name || 'Unknown',
                                  thumbnail: s.thumbnails?.[0]?.url,
                                }));
                                startPlayback(tracks, index);
                              }}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition w-full text-left"
                            >
                              <span className="w-6 text-center text-sm text-gray-400">
                                {index + 1}
                              </span>
                              <img
                                src={song.thumbnails?.[0]?.url || 'https://via.placeholder.com/40'}
                                alt={song.title}
                                className="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-gray-700"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{song.title}</div>
                                <div className="text-xs text-gray-500 truncate">
                                  {song.artists?.[0]?.name}
                                  {song.album?.name && ` • ${song.album.name}`}
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">{song.duration}</span>
                            </button>
                          )
                        )}
                      </div>
                      {/* Show More Button */}
                      {artistSongs.length > 5 && (
                        <button
                          onClick={() => setShowAllSongs(!showAllSongs)}
                          className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          {showAllSongs ? (
                            <>{t('search.showLess', 'Show Less')}</>
                          ) : (
                            <>
                              {t('search.showMore', 'Show More')} ({artistSongs.length - 5})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Albums & Singles - SearchPage와 동일한 레이아웃 */}
                  {artistAlbums.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">
                        {t('search.albumsAndSingles', 'Albums & Singles')} ({artistAlbums.length})
                      </h3>
                      <div className="space-y-3">
                        {(showAllAlbums ? artistAlbums : artistAlbums.slice(0, 4)).map(
                          (album, index) => (
                            <button
                              type="button"
                              key={album.browseId || index}
                              onClick={() => album.browseId && fetchAndShowAlbum(album.browseId)}
                              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition w-full text-left"
                            >
                              <img
                                src={album.thumbnails?.[0]?.url || 'https://via.placeholder.com/80'}
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
                            </button>
                          )
                        )}
                      </div>
                      {/* Show More Button */}
                      {artistAlbums.length > 4 && (
                        <button
                          onClick={() => setShowAllAlbums(!showAllAlbums)}
                          className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          {showAllAlbums ? (
                            <>{t('search.showLess', 'Show Less')}</>
                          ) : (
                            <>
                              {t('search.showMore', 'Show More')} ({artistAlbums.length - 4})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Videos Section */}
                  {artistVideos.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">
                        {t('search.videos', 'Videos')} ({artistVideos.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {artistVideos.slice(0, 4).map((video, index) => (
                          <button
                            type="button"
                            key={video.videoId || index}
                            onClick={() => {
                              const track = {
                                videoId: video.videoId,
                                title: video.title,
                                artist: video.artists?.[0]?.name || profile?.full_name || 'Unknown',
                                thumbnail: video.thumbnails?.[0]?.url,
                              };
                              setTrack(track);
                            }}
                            className="flex flex-col rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                          >
                            <div className="relative aspect-video">
                              <img
                                src={
                                  video.thumbnails?.[0]?.url || 'https://via.placeholder.com/160x90'
                                }
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition">
                                <Play size={32} className="text-white" fill="white" />
                              </div>
                              {video.views && (
                                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                  {video.views}
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <div className="text-sm font-medium truncate">{video.title}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {video.artists?.[0]?.name}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Similar Artists - SearchPage와 동일한 레이아웃 */}
                  {similarArtists.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">
                        {t('search.similarArtists', 'Similar Artists')} ({similarArtists.length})
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {similarArtists.map((artist, index) => (
                          <button
                            type="button"
                            key={artist.browseId || index}
                            onClick={() => {
                              // Navigate to similar artist's profile if they exist in DB
                              navigate(`/search?q=${encodeURIComponent(artist.artist)}`);
                            }}
                            className="flex flex-col items-center cursor-pointer group hover:scale-105 active:scale-95 transition-transform"
                          >
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2 ring-2 ring-transparent group-hover:ring-black dark:group-hover:ring-white transition-all shadow-md group-hover:shadow-lg">
                              <img
                                src={
                                  artist.thumbnails?.[0]?.url || 'https://via.placeholder.com/80'
                                }
                                alt={artist.artist}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-xs text-center font-medium truncate w-full px-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {artist.artist}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {artistSongs.length === 0 && artistAlbums.length === 0 && (
                    <div className="py-10 text-center text-gray-500">
                      <Music size={48} className="mx-auto mb-2 opacity-50" />
                      <p>{t('profile.noArtistMusic', 'No music found')}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // Regular User: Show saved music
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{t('profile.savedMusic', 'Saved Music')}</h3>
                  <p className="text-xs text-gray-500">
                    {userSavedSongs.length} {t('profile.songs')}
                  </p>
                </div>
                {userSavedSongs.length > 0 && (
                  <button
                    onClick={() => {
                      const tracks = userSavedSongs.map((s) => ({
                        videoId: s.videoId,
                        title: s.title,
                        artist: s.artist,
                        thumbnail: s.thumbnail,
                        cover: s.cover,
                      }));
                      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                      startPlayback(shuffled, 0);
                    }}
                    className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full text-sm font-semibold hover:opacity-80 transition"
                  >
                    <Shuffle size={16} />
                    {t('profile.shuffle')}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {userSavedSongs.length > 0 ? (
                  userSavedSongs.map((track, index) => (
                    <TrackItem
                      key={track.playlistId || index}
                      track={track}
                      index={index}
                      onPlay={(trackItem, idx) => {
                        const tracks = userSavedSongs.map((s) => ({
                          videoId: s.videoId,
                          title: s.title,
                          artist: s.artist,
                          thumbnail: s.thumbnail,
                          cover: s.cover,
                        }));
                        startPlayback(tracks, idx);
                      }}
                      isPlaying={isPlaying}
                      isCurrentTrack={currentTrack?.videoId === track.videoId}
                    />
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500">
                    <Music size={48} className="mx-auto mb-2 opacity-50" />
                    <p>{t('profile.noSavedMusic', 'No saved music yet')}</p>
                  </div>
                )}
              </div>
            </>
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
