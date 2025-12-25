/**
 * ProfilePage Helper Hooks
 * Extracted from ProfilePage.tsx to reduce cognitive complexity
 */
/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useCountry from '../hooks/useCountry';
import { secureShuffle } from '../lib/shuffle';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';
import useContentStore from '../stores/useContentStore';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';

// Import shared types and components from ProfileHelpers
import {
  type ArtistAlbum,
  type ArtistSong,
  type ArtistVideo,
  type HomeContentItem,
  type HomeSection,
  type LikedTrack,
  type Playlist,
  type Post,
  type Profile,
  type SimilarArtist,
  getBestThumbnail,
} from '../components/profile/ProfileHelpers';

// Re-export shared types and components so ProfilePage doesn't break
export {
  ArtistMusicTab,
  DiscoverTab,
  LikedMusicTab,
  PostsGrid,
  PrivateTab,
  ProfileActionButtons,
  ProfileTabBar,
  ProfileTabContent,
  UserSavedMusicTab,
  getBestThumbnail,
  type ArtistAlbum,
  type ArtistSong,
  type ArtistVideo,
  type HomeContentItem,
  type HomeData,
  type HomeSection,
  type LikedTrack,
  type Playlist,
  type Post,
  type Profile,
  type SimilarArtist,
} from '../components/profile/ProfileHelpers';

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

// Translation keys
const T_COMMON_UNKNOWN_ARTIST = 'common.unknownArtist';

// Helper: Map playlist to liked track
function mapPlaylistToLikedTrack(playlist: Playlist, artistName: string): LikedTrack {
  return {
    videoId: playlist.video_id as string,
    title: playlist.title || 'Unknown',
    artist: artistName,
    thumbnail: playlist.cover_url,
    cover: playlist.cover_url,
    cover_url: playlist.cover_url,
    playlistId: playlist.id,
  };
}

/**
 * Hook for fetching artist music data
 */
export function useArtistMusic(profile: Profile | null) {
  const [artistSongs, setArtistSongs] = useState<ArtistSong[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<ArtistAlbum[]>([]);
  const [artistVideos, setArtistVideos] = useState<ArtistVideo[]>([]);
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [isVirtualMember, setIsVirtualMember] = useState(false);

  useEffect(() => {
    if (!profile?.artist_browse_id) {
      setIsVirtualMember(false);
      setArtistSongs([]);
      setArtistAlbums([]);
      setArtistVideos([]);
      setSimilarArtists([]);
      return;
    }

    setIsVirtualMember(true);
    setLoading(true);

    const fetchArtistMusic = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/artist/${profile.artist_browse_id}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setArtistSongs(data.topSongs || []);
        setArtistAlbums(data.albums || []);
        setArtistVideos(data.videos || []);
        setSimilarArtists(data.related || []);
      } catch (err) {
        console.error('Error fetching artist music:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistMusic();
  }, [profile?.artist_browse_id]);

  return {
    artistSongs,
    artistAlbums,
    artistVideos,
    similarArtists,
    loading,
    isVirtualMember,
  };
}

/**
 * Hook for managing recommendation/discovery data
 */
export function useHomeData(activeTab: string, isOwnProfile: boolean = true) {
  const { homeData, setHomeData } = useContentStore();
  const [homeLoading, setHomeLoading] = useState(false);
  const country = useCountry();

  useEffect(() => {
    // Only fetch home data for own profile and discover tab
    if (isOwnProfile && activeTab === 'discover' && !homeData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHomeLoading(true);
      fetch(`${API_BASE_URL}/api/home?country=${country.code}`)
        .then((res) => res.json())
        .then((data) => {
          setHomeData(data);
        })
        .finally(() => setHomeLoading(false));
    }
  }, [activeTab, homeData, country.code, setHomeData, isOwnProfile]);

  return { homeData, homeLoading };
}

/**
 * Hook for managing profile playback interactions
 */
export function useProfilePlayback() {
  const { setTrack, startPlayback } = usePlayerStore();
  const { t } = useTranslation();

  const playHomeItem = useCallback(
    (item: HomeContentItem, _section: HomeSection) => {
      if (item.videoId) {
        setTrack({
          videoId: item.videoId,
          title: item.title || t('common.unknown'),
          artist: item.artists?.[0]?.name || item.subtitle || t(T_COMMON_UNKNOWN_ARTIST),
          thumbnail: getBestThumbnail(item.thumbnails) || '',
          cover: getBestThumbnail(item.thumbnails) || '',
        });
      } else if (item.playlistId || item.browseId) {
        const id = item.playlistId || item.browseId;
        fetch(`${API_BASE_URL}/api/playlist/${id}`)
          .then((res) => res.json())
          .then((data) => {
            const tracks = (data.tracks || []).map((tr: PlaylistTrackData) => ({
              videoId: tr.videoId,
              title: tr.title,
              artist:
                typeof tr.artists?.[0] === 'string'
                  ? tr.artists[0]
                  : (tr.artists?.[0] as { name: string })?.name || t(T_COMMON_UNKNOWN_ARTIST),
              thumbnail: tr.thumbnails?.[0]?.url || '',
            }));
            startPlayback(tracks, 0);
          });
      }
    },
    [setTrack, startPlayback, t]
  );

  const playPost = useCallback(
    (post: Post, profile: Profile | null) => {
      if (!post.video_id) return;
      setTrack({
        videoId: post.video_id,
        title: post.title,
        artist: profile?.username || t(T_COMMON_UNKNOWN_ARTIST),
        thumbnail: post.cover_url || `https://i.ytimg.com/vi/${post.video_id}/hqdefault.jpg`,
        cover: post.cover_url || `https://i.ytimg.com/vi/${post.video_id}/hqdefault.jpg`,
      });
    },
    [setTrack, t]
  );

  const playLikedTrack = useCallback(
    (track: LikedTrack, index: number, likedSongs: LikedTrack[]) => {
      const tracks = likedSongs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        cover: s.cover,
      }));
      startPlayback(tracks, index);
    },
    [startPlayback]
  );

  const shufflePlay = useCallback(
    (likedSongs: LikedTrack[]) => {
      const tracks = likedSongs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        cover: s.cover,
      }));
      const shuffled = secureShuffle(tracks);
      startPlayback(shuffled, 0);
    },
    [startPlayback]
  );

  const fetchAndShowAlbum = useCallback(
    (browseId: string) => {
      fetch(`${API_BASE_URL}/api/album/${browseId}`)
        .then((res) => res.json())
        .then((data) => {
          const tracks = (data.tracks || []).map((tr: ArtistSong) => ({
            videoId: tr.videoId,
            title: tr.title,
            artist: data.artist || t(T_COMMON_UNKNOWN_ARTIST),
            thumbnail: data.thumbnails?.[0]?.url || '',
          }));
          startPlayback(tracks, 0);
        });
    },
    [startPlayback, t]
  );

  return { playHomeItem, playPost, playLikedTrack, shufflePlay, fetchAndShowAlbum };
}

/**
 * Hook for managing conversations
 */
export function useConversation(targetUserId?: string, isOwnProfile?: boolean) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [startingConversation, setStartingConversation] = useState(false);

  const startConversation = useCallback(async () => {
    if (!user || isOwnProfile || !targetUserId) return;
    setStartingConversation(true);
    try {
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        navigate(`/messages/${existing.id}`);
      } else {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({ user1_id: user.id, user2_id: targetUserId })
          .select()
          .single();

        if (createError) throw createError;
        navigate(`/messages/${newConv.id}`);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    } finally {
      setStartingConversation(false);
    }
  }, [user, isOwnProfile, targetUserId, navigate]);

  return { startConversation, startingConversation };
}

/**
 * Main profile data fetching hook
 */
export function useProfileData(targetUserId?: string, isOwnProfile?: boolean) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<LikedTrack[]>([]);
  const [userSavedSongs, setUserSavedSongs] = useState<LikedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    artistSongs,
    artistAlbums,
    artistVideos,
    similarArtists,
    loading: artistMusicLoading,
    isVirtualMember,
  } = useArtistMusic(profile);

  useEffect(() => {
    if (!targetUserId) return;

    async function fetchProfileData() {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (profileError) throw profileError;
        const profileInfo = profileData as Profile;
        setProfile(profileInfo);

        await Promise.all([
          fetchPosts(targetUserId!, isOwnProfile || false),
          fetchPlaylistsAndSongs(targetUserId!, profileInfo, isOwnProfile || false),
        ]);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchPosts(userId: string, ownProfile: boolean) {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!ownProfile) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      if (!error) {
        setPosts((data as Post[]) || []);
      }
    }

    async function fetchPlaylistsAndSongs(
      userId: string,
      profileInfo: Profile,
      ownProfile: boolean
    ) {
      const { data: playlistData, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return;
      setPlaylists((playlistData as Playlist[]) || []);

      const playlistsWithVideo = ((playlistData as Playlist[]) || []).filter((p) => p.video_id);
      const artistName = profileInfo.username || t(T_COMMON_UNKNOWN_ARTIST);

      if (ownProfile) {
        setLikedSongs(playlistsWithVideo.map((p) => mapPlaylistToLikedTrack(p, artistName)));
      } else {
        setUserSavedSongs(playlistsWithVideo.map((p) => mapPlaylistToLikedTrack(p, artistName)));
      }
    }

    fetchProfileData();
  }, [targetUserId, isOwnProfile, t]);

  const deleteSong = useCallback(async (track: LikedTrack) => {
    if (!track.playlistId) return;
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', track.playlistId);
      if (error) throw error;
      setLikedSongs((prev) => prev.filter((s) => s.playlistId !== track.playlistId));
      setPlaylists((prev) => prev.filter((p) => p.id !== track.playlistId));
    } catch {
      // Error
    }
  }, []);

  return {
    profile,
    setProfile,
    posts,
    playlists,
    setPlaylists,
    likedSongs,
    userSavedSongs,
    loading,
    artistSongs,
    artistAlbums,
    artistVideos,
    similarArtists,
    artistMusicLoading,
    isVirtualMember,
    deleteSong,
    setLikedSongs,
  };
}
