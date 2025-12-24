/**
 * ProfilePage Helper Hooks
 * Extracted from ProfilePage.tsx to reduce cognitive complexity
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
