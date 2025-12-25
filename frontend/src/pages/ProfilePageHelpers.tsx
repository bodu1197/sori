/**
 * ProfilePage Helper Hooks
 * Extracted from ProfilePage.tsx to reduce cognitive complexity
 */
import React, { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Heart,
  Play,
  Music,
  Shuffle,
  Lock,
  Disc,
  Grid,
  LogOut,
  Settings,
  UserPlus,
} from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import useContentStore from '../stores/useContentStore';
import useCountry from '../hooks/useCountry';
import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

// Types
export interface Profile {
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

export interface LikedTrack {
  videoId: string;
  title: string;
  artist: string;
  thumbnail?: string;
  cover?: string;
  cover_url?: string;
  playlistId: string;
}

export interface Post {
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

export interface Playlist {
  id: string;
  title?: string;
  video_id?: string;
  cover_url?: string;
  is_public?: boolean;
  created_at: string;
}

export interface ArtistSong {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  album?: { name: string; id?: string };
  thumbnails?: Array<{ url: string }>;
  duration?: string;
}

export interface ArtistAlbum {
  browseId?: string;
  title: string;
  type?: string;
  year?: string;
  thumbnails?: Array<{ url: string }>;
}

export interface ArtistVideo {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string }>;
  views?: string;
}

export interface SimilarArtist {
  browseId: string;
  artist: string;
  thumbnails?: Array<{ url: string }>;
}

export interface HomeContentItem {
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

export interface HomeSection {
  title: string;
  contents: HomeContentItem[];
}

export interface HomeData {
  sections: HomeSection[];
}

// Helper: Get best thumbnail
export function getBestThumbnail(
  thumbnails?: Array<{ url: string; width?: number; height?: number }>
): string | null {
  if (!thumbnails || thumbnails.length === 0) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
}

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
    async function fetchArtistMusic() {
      if (!profile) return;

      const isArtist = profile.member_type === 'artist' && !!profile.artist_browse_id;
      setIsVirtualMember(isArtist);

      if (!isArtist || !profile.full_name) return;

      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/search/quick?q=${encodeURIComponent(profile.full_name)}`
        );
        if (response.ok) {
          const data = await response.json();
          setArtistSongs(data.songs || []);
          setArtistAlbums(data.albums || []);
          setArtistVideos(data.videos || []);

          const mappedSimilar = (data.similarArtists || []).map(
            (a: { browseId: string; name: string; thumbnail?: string }) => ({
              browseId: a.browseId,
              artist: a.name,
              thumbnails: a.thumbnail ? [{ url: a.thumbnail }] : [],
            })
          );
          setSimilarArtists(mappedSimilar);
        }
      } catch (err) {
        console.error('Error fetching artist music:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchArtistMusic();
  }, [profile]);

  return {
    artistSongs,
    artistAlbums,
    artistVideos,
    similarArtists,
    artistMusicLoading: loading,
    isVirtualMember,
  };
}

/**
 * Hook for fetching home/discover data
 */
export function useHomeData(activeTab: string) {
  const country = useCountry();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [homeLoading, setHomeLoading] = useState(false);

  useEffect(() => {
    async function fetchHomeData() {
      if (activeTab !== 'discover' || homeData) return;

      const {
        homeData: cachedData,
        homeDataLoadedAt,
        setHomeData: setCachedData,
      } = useContentStore.getState();
      const now = Date.now();

      if (cachedData && homeDataLoadedAt && now - homeDataLoadedAt < 5 * 60 * 1000) {
        setHomeData(cachedData);
        return;
      }

      setHomeLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/home?country=${country.code}&limit=6`);
        if (response.ok) {
          const data = await response.json();
          setHomeData(data);
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

  return { homeData, homeLoading, countryCode: country.code };
}

/**
 * Hook for managing playback actions
 */
export function useProfilePlayback() {
  const { t } = useTranslation();
  const country = useCountry();
  const { setTrack, startPlayback, openTrackPanel, setTrackPanelLoading } = usePlayerStore();

  // Fetch and show playlist
  const fetchAndShowPlaylist = useCallback(
    async (playlistId: string) => {
      setTrackPanelLoading(true);
      openTrackPanel({ title: t('common.loading'), tracks: [], trackCount: 0 });

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
        // Error
      } finally {
        setTrackPanelLoading(false);
      }
    },
    [t, country.code, openTrackPanel, setTrackPanelLoading]
  );

  // Fetch and show album
  const fetchAndShowAlbum = useCallback(
    async (browseId: string) => {
      setTrackPanelLoading(true);
      openTrackPanel({ title: t('common.loading'), tracks: [], trackCount: 0 });

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/album/${browseId}?country=${country.code}`
        );
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
        // Error
      } finally {
        setTrackPanelLoading(false);
      }
    },
    [t, country.code, openTrackPanel, setTrackPanelLoading]
  );

  // Play home content item
  const playHomeItem = useCallback(
    (item: HomeContentItem, section: HomeSection) => {
      if (item.videoId) {
        const sectionVideoTracks = section.contents.filter((c) => c.videoId);
        const panelTracks: PlaylistTrackData[] = sectionVideoTracks.map((c) => ({
          videoId: c.videoId as string,
          title: c.title,
          artists:
            c.artists || (c.subtitle ? [{ name: c.subtitle }] : [{ name: t('common.unknown') }]),
          thumbnails: c.thumbnails,
        }));

        openTrackPanel({
          title: section.title,
          author: { name: `${sectionVideoTracks.length} ${t('profile.tracks')}` },
          tracks: panelTracks,
          trackCount: sectionVideoTracks.length,
        });

        const videoTrackIndex = sectionVideoTracks.findIndex((c) => c.videoId === item.videoId);
        const tracks = sectionVideoTracks.map((c) => ({
          videoId: c.videoId as string,
          title: c.title,
          artist: c.artists?.map((a) => a.name).join(', ') || c.subtitle || t('common.unknown'),
          thumbnail: getBestThumbnail(c.thumbnails) || undefined,
        }));
        startPlayback(tracks, videoTrackIndex >= 0 ? videoTrackIndex : 0);
        return;
      }

      if (item.playlistId) {
        fetchAndShowPlaylist(item.playlistId);
        return;
      }

      if (item.browseId) {
        fetchAndShowAlbum(item.browseId);
      }
    },
    [t, openTrackPanel, startPlayback, fetchAndShowPlaylist, fetchAndShowAlbum]
  );

  // Play a post
  const playPost = useCallback(
    (post: Post, profile: Profile | null) => {
      if (!post.video_id) return;

      const panelTrack: PlaylistTrackData = {
        videoId: post.video_id,
        title: post.title || t('common.unknown'),
        artists: post.artist ? [{ name: post.artist }] : [{ name: t('common.unknownArtist') }],
        thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
      };
      openTrackPanel({
        title: post.title || t('profile.track'),
        author: { name: post.artist || profile?.username || t('profile.you') },
        thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
        tracks: [panelTrack],
        trackCount: 1,
      });

      setTrack({
        videoId: post.video_id,
        title: post.title || t('common.unknown'),
        artist: post.artist || t('common.unknownArtist'),
        thumbnail: post.cover_url,
        cover: post.cover_url,
      });
    },
    [t, openTrackPanel, setTrack]
  );

  // Play liked track
  const playLikedTrack = useCallback(
    (track: LikedTrack, index: number, likedSongs: LikedTrack[]) => {
      if (likedSongs.length > 0) {
        const panelTracks: PlaylistTrackData[] = likedSongs.map((s) => ({
          videoId: s.videoId,
          title: s.title,
          artists: [{ name: s.artist || t('common.unknownArtist') }],
          thumbnails: s.thumbnail ? [{ url: s.thumbnail }] : undefined,
        }));
        openTrackPanel({
          title: t('profile.yourMusic'),
          author: { name: `${likedSongs.length} ${t('profile.songs')}` },
          tracks: panelTracks,
          trackCount: likedSongs.length,
        });

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
    },
    [t, openTrackPanel, startPlayback, setTrack]
  );

  // Shuffle play
  const shufflePlay = useCallback(
    (likedSongs: LikedTrack[]) => {
      if (likedSongs.length === 0) return;

      const panelTracks: PlaylistTrackData[] = likedSongs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artists: [{ name: s.artist || t('common.unknownArtist') }],
        thumbnails: s.thumbnail ? [{ url: s.thumbnail }] : undefined,
      }));
      openTrackPanel({
        title: t('profile.yourMusic'),
        author: { name: `${likedSongs.length} ${t('profile.songs')}` },
        tracks: panelTracks,
        trackCount: likedSongs.length,
      });

      const tracks = likedSongs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        cover: s.cover,
      }));
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      startPlayback(shuffled, 0);
    },
    [t, openTrackPanel, startPlayback]
  );

  return {
    playHomeItem,
    playPost,
    playLikedTrack,
    shufflePlay,
    fetchAndShowPlaylist,
    fetchAndShowAlbum,
  };
}

/**
 * Hook for managing conversation start
 */
export function useConversation(targetUserId: string | undefined, isOwnProfile: boolean) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [startingConversation, setStartingConversation] = useState(false);

  const startConversation = useCallback(async () => {
    if (!user?.id || !targetUserId || isOwnProfile || startingConversation) return;

    setStartingConversation(true);
    try {
      // Check if conversation already exists
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

      // Add participants
      const { error: participantsError } = await supabase.from('conversation_participants').insert([
        { conversation_id: newConversation.id, user_id: user.id },
        { conversation_id: newConversation.id, user_id: targetUserId },
      ]);

      if (participantsError) throw participantsError;

      navigate(`/messages/${newConversation.id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setStartingConversation(false);
    }
  }, [user?.id, targetUserId, isOwnProfile, startingConversation, navigate]);

  return { startConversation, startingConversation };
}

/**
 * Hook for managing liked songs
 */
export function useProfileLikedSongs() {
  const [likedSongs, setLikedSongs] = useState<LikedTrack[]>([]);

  const deleteSong = useCallback(async (track: LikedTrack) => {
    if (!track.playlistId) return;

    try {
      const { error } = await supabase.from('playlists').delete().eq('id', track.playlistId);
      if (error) throw error;
      setLikedSongs((prev) => prev.filter((s) => s.playlistId !== track.playlistId));
    } catch {
      // Error deleting
    }
  }, []);

  return { likedSongs, setLikedSongs, deleteSong };
}

/**
 * Hook for fetching profile data and related content
 */
export function useProfileData(targetUserId: string | undefined, isOwnProfile: boolean) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<LikedTrack[]>([]);
  const [userSavedSongs, setUserSavedSongs] = useState<LikedTrack[]>([]);
  const [loading, setLoading] = useState(true);

  // Artist music state
  const [artistSongs, setArtistSongs] = useState<ArtistSong[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<ArtistAlbum[]>([]);
  const [artistVideos, setArtistVideos] = useState<ArtistVideo[]>([]);
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [artistMusicLoading, setArtistMusicLoading] = useState(false);
  const [isVirtualMember, setIsVirtualMember] = useState(false);

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

        // Check if virtual member
        const isArtist = profileInfo.member_type === 'artist' && !!profileInfo.artist_browse_id;
        setIsVirtualMember(isArtist);

        // Fetch artist music for virtual members
        if (isArtist && profileInfo.full_name) {
          await fetchArtistMusic(profileInfo.full_name);
        }

        // 2. Fetch Posts
        await fetchPosts(targetUserId, isOwnProfile);

        // 3. Fetch Playlists and Liked Songs
        await fetchPlaylistsAndSongs(targetUserId, profileInfo, isOwnProfile);
      } catch {
        // Error fetching profile
      } finally {
        setLoading(false);
      }
    }

    async function fetchArtistMusic(artistName: string) {
      setArtistMusicLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/search/quick?q=${encodeURIComponent(artistName)}`
        );
        if (response.ok) {
          const data = await response.json();
          setArtistSongs(data.songs || []);
          setArtistAlbums(data.albums || []);
          setArtistVideos(data.videos || []);
          const mappedSimilar = (data.similarArtists || []).map(
            (a: { browseId: string; name: string; thumbnail?: string }) => ({
              browseId: a.browseId,
              artist: a.name,
              thumbnails: a.thumbnail ? [{ url: a.thumbnail }] : [],
            })
          );
          setSimilarArtists(mappedSimilar);
        }
      } catch {
        // Error
      } finally {
        setArtistMusicLoading(false);
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
      const artistName = profileInfo.username || t('common.unknownArtist');

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

// =============================================================================
// UI Components for ProfilePage Tab Contents
// =============================================================================

// Posts Grid Component
interface PostsGridProps {
  posts: Post[];
  currentTrackVideoId?: string;
  isPlaying: boolean;
  onPlayPost: (post: Post) => void;
  t: (key: string) => string;
}

export function PostsGrid({
  posts,
  currentTrackVideoId,
  isPlaying,
  onPlayPost,
  t,
}: PostsGridProps) {
  if (posts.length === 0) {
    return (
      <div className="col-span-3 py-10 text-center text-gray-500 text-sm">
        {t('profile.noPostsYet')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((post) => {
        const isCurrentlyPlaying = currentTrackVideoId === post.video_id && isPlaying;
        return (
          <button
            type="button"
            key={post.id}
            onClick={() => onPlayPost(post)}
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
                    />
                    <div
                      className="w-1 h-6 bg-white animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-1 h-6 bg-white animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={20} className="text-white ml-0.5" fill="white" />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <span className="text-white text-xs font-medium line-clamp-1">{post.title}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Discover Tab Content Component
interface DiscoverTabProps {
  homeData: HomeData | null;
  homeLoading: boolean;
  onPlayHomeItem: (item: HomeContentItem, section: HomeSection, index: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function DiscoverTab({ homeData, homeLoading, onPlayHomeItem, t }: DiscoverTabProps) {
  if (homeLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white" />
      </div>
    );
  }

  if (!homeData?.sections || homeData.sections.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500">
        <Disc size={48} className="mx-auto mb-2 opacity-50" />
        <p>{t('profile.noRecommendations', 'No recommendations available')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {homeData.sections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          <h3 className="font-bold text-lg mb-3">{section.title}</h3>
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
            {section.contents.slice(0, 12).map((item, itemIndex) => (
              <button
                type="button"
                key={item.videoId || item.playlistId || itemIndex}
                onClick={() => onPlayHomeItem(item, section, itemIndex)}
                className="flex-shrink-0 w-36 cursor-pointer group text-left"
              >
                <div className="relative">
                  <img
                    src={getBestThumbnail(item.thumbnails) || 'https://via.placeholder.com/144'}
                    alt={item.title}
                    className="w-36 h-36 rounded-lg object-cover shadow-md group-hover:shadow-lg transition-shadow"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.src = 'https://via.placeholder.com/144';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Play size={24} className="text-black ml-1" fill="black" />
                    </div>
                  </div>
                  {item.views && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {item.views}
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-medium text-sm line-clamp-2 leading-tight">{item.title}</div>
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
      ))}
    </div>
  );
}

// Private Tab Component
interface PrivateTabProps {
  t: (key: string) => string;
}

export function PrivateTab({ t }: PrivateTabProps) {
  return (
    <div className="py-20 text-center text-gray-500">
      <Lock size={48} className="mx-auto mb-2 opacity-50" />
      <p>{t('profile.private')}</p>
    </div>
  );
}

// Artist Music Tab Component (for virtual members)
interface ArtistMusicTabProps {
  artistMusicLoading: boolean;
  artistSongs: ArtistSong[];
  artistAlbums: ArtistAlbum[];
  artistVideos: ArtistVideo[];
  similarArtists: SimilarArtist[];
  showAllSongs: boolean;
  showAllAlbums: boolean;
  onToggleShowAllSongs: () => void;
  onToggleShowAllAlbums: () => void;
  onPlaySong: (songs: ArtistSong[], index: number) => void;
  onShufflePlay: (songs: ArtistSong[]) => void;
  onPlayVideo: (video: ArtistVideo) => void;
  onShowAlbum: (browseId: string) => void;
  onNavigateToArtist: (artistName: string) => void;
  profileName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function ArtistMusicTab({
  artistMusicLoading,
  artistSongs,
  artistAlbums,
  artistVideos,
  similarArtists,
  showAllSongs,
  showAllAlbums,
  onToggleShowAllSongs,
  onToggleShowAllAlbums,
  onPlaySong,
  onShufflePlay,
  onPlayVideo,
  onShowAlbum,
  onNavigateToArtist,
  profileName,
  t,
}: ArtistMusicTabProps) {
  if (artistMusicLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white" />
      </div>
    );
  }

  if (artistSongs.length === 0 && artistAlbums.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500">
        <Music size={48} className="mx-auto mb-2 opacity-50" />
        <p>{t('profile.noArtistMusic', 'No music found')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Tracks */}
      {artistSongs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">
              {t('search.topTracks', 'Top Tracks')} ({artistSongs.length})
            </h3>
            <button
              onClick={() => onShufflePlay(artistSongs)}
              className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full text-sm font-semibold hover:opacity-80 transition"
            >
              <Shuffle size={16} />
              {t('profile.shuffle')}
            </button>
          </div>
          <div className="space-y-1">
            {(showAllSongs ? artistSongs : artistSongs.slice(0, 5)).map((song, index) => (
              <button
                type="button"
                key={song.videoId || index}
                onClick={() => onPlaySong(artistSongs, index)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition w-full text-left"
              >
                <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
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
            ))}
          </div>
          {artistSongs.length > 5 && (
            <button
              onClick={onToggleShowAllSongs}
              className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
            >
              {showAllSongs
                ? t('search.showLess', 'Show Less')
                : `${t('search.showMore', 'Show More')} (${artistSongs.length - 5})`}
            </button>
          )}
        </div>
      )}

      {/* Albums & Singles */}
      {artistAlbums.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-3">
            {t('search.albumsAndSingles', 'Albums & Singles')} ({artistAlbums.length})
          </h3>
          <div className="space-y-3">
            {(showAllAlbums ? artistAlbums : artistAlbums.slice(0, 4)).map((album, index) => (
              <button
                type="button"
                key={album.browseId || index}
                onClick={() => album.browseId && onShowAlbum(album.browseId)}
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
            ))}
          </div>
          {artistAlbums.length > 4 && (
            <button
              onClick={onToggleShowAllAlbums}
              className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
            >
              {showAllAlbums
                ? t('search.showLess', 'Show Less')
                : `${t('search.showMore', 'Show More')} (${artistAlbums.length - 4})`}
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
                onClick={() => onPlayVideo(video)}
                className="flex flex-col rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
              >
                <div className="relative aspect-video">
                  <img
                    src={video.thumbnails?.[0]?.url || 'https://via.placeholder.com/160x90'}
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
                  <div className="text-xs text-gray-500 truncate">{video.artists?.[0]?.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Similar Artists */}
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
                onClick={() => onNavigateToArtist(artist.artist)}
                className="flex flex-col items-center cursor-pointer group hover:scale-105 active:scale-95 transition-transform"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2 ring-2 ring-transparent group-hover:ring-black dark:group-hover:ring-white transition-all shadow-md group-hover:shadow-lg">
                  <img
                    src={artist.thumbnails?.[0]?.url || 'https://via.placeholder.com/80'}
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
    </div>
  );
}

// Liked Music Tab Component (for own profile)
interface LikedMusicTabProps {
  likedSongs: LikedTrack[];
  recommendedTracks: PlaylistTrackData[];
  recommendationContext: { title: string; message: string } | null;
  currentTrackVideoId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: LikedTrack, index: number) => void;
  onDeleteSong: (track: LikedTrack) => void;
  onShufflePlay: () => void;
  onPlayRecommendedTrack: (tracks: PlaylistTrackData[], index: number) => void;
  onClearRecommendations: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function LikedMusicTab({
  likedSongs,
  recommendedTracks,
  recommendationContext,
  currentTrackVideoId,
  isPlaying,
  onPlayTrack,
  onDeleteSong,
  onShufflePlay,
  onPlayRecommendedTrack,
  onClearRecommendations,
  t,
}: LikedMusicTabProps) {
  return (
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
            onClick={onShufflePlay}
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
          <RecommendationsSection
            recommendedTracks={recommendedTracks}
            recommendationContext={recommendationContext}
            currentTrackVideoId={currentTrackVideoId}
            isPlaying={isPlaying}
            onPlayTrack={onPlayRecommendedTrack}
            onClear={onClearRecommendations}
            t={t}
          />
        )}

        {/* Main Liked Songs */}
        {likedSongs.length > 0 ? (
          likedSongs.map((track, index) => (
            <LikedTrackItem
              key={track.playlistId || index}
              track={track}
              index={index}
              onPlay={onPlayTrack}
              onDelete={onDeleteSong}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrackVideoId === track.videoId}
              t={t}
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
  );
}

// Recommendations Section Sub-component
interface RecommendationsSectionProps {
  recommendedTracks: PlaylistTrackData[];
  recommendationContext: { title: string; message: string } | null;
  currentTrackVideoId?: string;
  isPlaying: boolean;
  onPlayTrack: (tracks: PlaylistTrackData[], index: number) => void;
  onClear: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

function RecommendationsSection({
  recommendedTracks,
  recommendationContext,
  currentTrackVideoId,
  isPlaying,
  onPlayTrack,
  onClear,
  t,
}: RecommendationsSectionProps) {
  return (
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
          onClick={onClear}
          className="text-xs font-medium text-gray-400 hover:text-black dark:hover:text-white px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          {t('common.clear')}
        </button>
      </div>

      <div className="space-y-1">
        {recommendedTracks.map((track, index) => {
          const safeThumbnail = track.videoId
            ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`
            : track.thumbnails?.[0]?.url || (track as any).thumbnail || '';

          return (
            <LikedTrackItem
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
                playlistId: 'temp-rec',
              }}
              index={index}
              onPlay={() => onPlayTrack(recommendedTracks, index)}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrackVideoId === track.videoId}
              t={t}
            />
          );
        })}
      </div>
      <div className="my-6 border-t border-gray-100 dark:border-gray-800" />
    </div>
  );
}

// Liked Track Item Component
interface LikedTrackItemProps {
  track: LikedTrack;
  index: number;
  onPlay: (track: LikedTrack, index: number) => void;
  onDelete?: (track: LikedTrack) => void;
  isPlaying: boolean;
  isCurrentTrack: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

function LikedTrackItem({
  track,
  index,
  onPlay,
  onDelete,
  isPlaying,
  isCurrentTrack,
  t,
}: LikedTrackItemProps) {
  const [showDelete, setShowDelete] = React.useState(false);

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
      {/* Thumbnail */}
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
              />
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
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

      {/* Delete Button */}
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(track);
          }}
          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title={t('profile.removeFromLiked', 'Remove from liked')}
        >
          <Heart size={16} />
        </button>
      )}

      {/* Play Button */}
      <button
        onClick={(e) => {
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

// User Saved Music Tab Component (for other users' profile)
interface UserSavedMusicTabProps {
  userSavedSongs: LikedTrack[];
  currentTrackVideoId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: LikedTrack, index: number, songs: LikedTrack[]) => void;
  onShufflePlay: (songs: LikedTrack[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function UserSavedMusicTab({
  userSavedSongs,
  currentTrackVideoId,
  isPlaying,
  onPlayTrack,
  onShufflePlay,
  t,
}: UserSavedMusicTabProps) {
  return (
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
            onClick={() => onShufflePlay(userSavedSongs)}
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
            <LikedTrackItem
              key={track.playlistId || index}
              track={track}
              index={index}
              onPlay={(trackItem, idx) => onPlayTrack(trackItem, idx, userSavedSongs)}
              isPlaying={isPlaying}
              isCurrentTrack={currentTrackVideoId === track.videoId}
              t={t}
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
  );
}

// =============================================================================
// ProfileActionButtons Component
// =============================================================================

interface ProfileActionButtonsProps {
  isOwnProfile: boolean;
  targetUserId?: string;
  onNavigateEdit: () => void;
  onNavigateSettings: () => void;
  onSignOut: () => void;
  onFollowChange: (isFollowing: boolean) => void;
  onStartConversation: () => void;
  startingConversation: boolean;
  t: TFunction;
  FollowButtonComponent: React.ComponentType<{
    userId: string;
    size: 'sm' | 'md' | 'lg';
    className: string;
    showDropdown: boolean;
    onFollowChange: (isFollowing: boolean) => void;
  }>;
}

export function ProfileActionButtons({
  isOwnProfile,
  targetUserId,
  onNavigateEdit,
  onNavigateSettings,
  onSignOut,
  onFollowChange,
  onStartConversation,
  startingConversation,
  t,
  FollowButtonComponent,
}: ProfileActionButtonsProps) {
  if (isOwnProfile) {
    return (
      <div className="flex gap-2 mb-4">
        <button
          onClick={onNavigateEdit}
          className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          {t('profile.editProfile')}
        </button>
        <button
          onClick={onNavigateSettings}
          className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          title={t('profile.settings', 'Settings')}
        >
          <Settings size={18} />
        </button>
        <button
          onClick={onSignOut}
          className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-red-500"
          title={t('profile.signOut')}
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-4">
      <FollowButtonComponent
        userId={targetUserId!}
        size="md"
        className="flex-1"
        showDropdown
        onFollowChange={onFollowChange}
      />
      <button
        onClick={onStartConversation}
        disabled={startingConversation}
        className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center disabled:opacity-50"
      >
        {t('profile.message')}
      </button>
      <button
        className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        title={t('profile.suggestedUsers', 'Suggested users')}
      >
        <UserPlus size={18} />
      </button>
    </div>
  );
}

// =============================================================================
// ProfileTabBar Component
// =============================================================================

type TabType = 'posts' | 'liked' | 'discover' | 'private' | 'music';

interface ProfileTabBarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOwnProfile: boolean;
}

export function ProfileTabBar({ activeTab, setActiveTab, isOwnProfile }: ProfileTabBarProps) {
  const getTabClass = (tab: TabType) =>
    `flex-1 flex justify-center py-3 border-b-2 ${
      activeTab === tab
        ? 'border-black dark:border-white text-black dark:text-white'
        : 'border-transparent text-gray-400'
    }`;

  return (
    <div className="flex border-t border-gray-100 dark:border-gray-800">
      <button onClick={() => setActiveTab('posts')} className={getTabClass('posts')}>
        <Grid size={24} />
      </button>
      {isOwnProfile && (
        <button onClick={() => setActiveTab('liked')} className={getTabClass('liked')}>
          <Heart size={24} />
        </button>
      )}
      {isOwnProfile ? (
        <button onClick={() => setActiveTab('discover')} className={getTabClass('discover')}>
          <Disc size={24} />
        </button>
      ) : (
        <button onClick={() => setActiveTab('music')} className={getTabClass('music')}>
          <Music size={24} />
        </button>
      )}
      {isOwnProfile && (
        <button onClick={() => setActiveTab('private')} className={getTabClass('private')}>
          <Lock size={24} />
        </button>
      )}
    </div>
  );
}

// ProfileTabContent - Eliminates nested ternaries
interface ProfileTabContentProps {
  activeTab: TabType;
  isVirtualMember: boolean;
  // Liked tab props
  likedSongs: LikedTrack[];
  recommendedTracks: PlaylistTrackData[];
  recommendationContext: { title: string; message: string } | null;
  currentTrackVideoId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: LikedTrack, index: number) => void;
  onDeleteSong: (track: LikedTrack) => void;
  onShufflePlay: () => void;
  onPlayRecommendedTrack: (tracks: PlaylistTrackData[], index: number) => void;
  onClearRecommendations: () => void;
  // Posts tab props
  posts: Post[];
  onPlayPost: (post: Post) => void;
  // Discover tab props
  homeData: HomeData | null;
  homeLoading: boolean;
  onPlayHomeItem: (item: HomeContentItem, section: HomeSection, index: number) => void;
  // Artist music tab props
  artistMusicLoading: boolean;
  artistSongs: ArtistSong[];
  artistAlbums: ArtistAlbum[];
  artistVideos: ArtistVideo[];
  similarArtists: SimilarArtist[];
  showAllSongs: boolean;
  showAllAlbums: boolean;
  onToggleShowAllSongs: () => void;
  onToggleShowAllAlbums: () => void;
  onPlaySong: (
    songs: Array<{
      videoId: string;
      title: string;
      artists?: Array<{ name: string }>;
      thumbnails?: Array<{ url: string }>;
    }>,
    index: number
  ) => void;
  onShufflePlayArtist: (
    songs: Array<{
      videoId: string;
      title: string;
      artists?: Array<{ name: string }>;
      thumbnails?: Array<{ url: string }>;
    }>
  ) => void;
  onPlayVideo: (video: {
    videoId: string;
    title: string;
    artists?: Array<{ name: string }>;
    thumbnails?: Array<{ url: string }>;
  }) => void;
  onShowAlbum: (browseId: string) => void;
  onNavigateToArtist: (artistName: string) => void;
  profileName?: string;
  // User saved music tab props
  userSavedSongs: LikedTrack[];
  onUserSavedPlayTrack: (track: LikedTrack, idx: number, songs: LikedTrack[]) => void;
  onUserSavedShufflePlay: (songs: LikedTrack[]) => void;
  t: TFunction;
}

export function ProfileTabContent({
  activeTab,
  isVirtualMember,
  likedSongs,
  recommendedTracks,
  recommendationContext,
  currentTrackVideoId,
  isPlaying,
  onPlayTrack,
  onDeleteSong,
  onShufflePlay,
  onPlayRecommendedTrack,
  onClearRecommendations,
  posts,
  onPlayPost,
  homeData,
  homeLoading,
  onPlayHomeItem,
  artistMusicLoading,
  artistSongs,
  artistAlbums,
  artistVideos,
  similarArtists,
  showAllSongs,
  showAllAlbums,
  onToggleShowAllSongs,
  onToggleShowAllAlbums,
  onPlaySong,
  onShufflePlayArtist,
  onPlayVideo,
  onShowAlbum,
  onNavigateToArtist,
  profileName,
  userSavedSongs,
  onUserSavedPlayTrack,
  onUserSavedShufflePlay,
  t,
}: ProfileTabContentProps) {
  switch (activeTab) {
    case 'liked':
      return (
        <LikedMusicTab
          likedSongs={likedSongs}
          recommendedTracks={recommendedTracks}
          recommendationContext={recommendationContext}
          currentTrackVideoId={currentTrackVideoId}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onDeleteSong={onDeleteSong}
          onShufflePlay={onShufflePlay}
          onPlayRecommendedTrack={onPlayRecommendedTrack}
          onClearRecommendations={onClearRecommendations}
          t={t}
        />
      );
    case 'posts':
      return (
        <PostsGrid
          posts={posts}
          currentTrackVideoId={currentTrackVideoId}
          isPlaying={isPlaying}
          onPlayPost={onPlayPost}
          t={t}
        />
      );
    case 'discover':
      return (
        <DiscoverTab
          homeData={homeData}
          homeLoading={homeLoading}
          onPlayHomeItem={onPlayHomeItem}
          t={t}
        />
      );
    case 'music':
      return (
        <div className="p-4">
          {isVirtualMember ? (
            <ArtistMusicTab
              artistMusicLoading={artistMusicLoading}
              artistSongs={artistSongs}
              artistAlbums={artistAlbums}
              artistVideos={artistVideos}
              similarArtists={similarArtists}
              showAllSongs={showAllSongs}
              showAllAlbums={showAllAlbums}
              onToggleShowAllSongs={onToggleShowAllSongs}
              onToggleShowAllAlbums={onToggleShowAllAlbums}
              onPlaySong={onPlaySong}
              onShufflePlay={onShufflePlayArtist}
              onPlayVideo={onPlayVideo}
              onShowAlbum={onShowAlbum}
              onNavigateToArtist={onNavigateToArtist}
              profileName={profileName}
              t={t}
            />
          ) : (
            <UserSavedMusicTab
              userSavedSongs={userSavedSongs}
              currentTrackVideoId={currentTrackVideoId}
              isPlaying={isPlaying}
              onPlayTrack={onUserSavedPlayTrack}
              onShufflePlay={onUserSavedShufflePlay}
              t={t}
            />
          )}
        </div>
      );
    case 'private':
    default:
      return <PrivateTab t={t} />;
  }
}
