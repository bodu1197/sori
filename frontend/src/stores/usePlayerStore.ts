import { create } from 'zustand';
import { sanitizeArtistName } from '../lib/api';
import { secureRandomIndex } from '../lib/shuffle';

export interface Track {
  videoId: string;
  title: string;
  artist?: string;
  thumbnail?: string;
  cover?: string;
  duration?: string;
}

export interface PlaylistTrackData {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  thumbnail?: string;
  duration?: string;
  album?: { name?: string; id?: string };
  isAvailable?: boolean;
}

export interface TrackPanelPlaylist {
  title: string;
  description?: string;
  author?: { name: string };
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  thumbnail?: string;
  tracks: PlaylistTrackData[];
  trackCount?: number;
}

export type RepeatMode = 'none' | 'all' | 'one';

interface YouTubePlayer {
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  // Playlist API
  loadPlaylist: (options: {
    list: string;
    listType: 'playlist' | 'user_uploads';
    index?: number;
    startSeconds?: number;
  }) => void;
  getPlaylist: () => string[];
  getPlaylistIndex: () => number;
  playVideoAt: (index: number) => void;
}

interface PlayerState {
  // Player State
  isPlaying: boolean;
  isReady: boolean;
  isLoading: boolean;

  // Current Track
  currentTrack: Track | null;
  currentIndex: number;

  // Playlist
  playlist: Track[];

  // YouTube Playlist Mode
  youtubePlaylistId: string | null;
  youtubePlaylistMode: boolean;

  // Modes
  shuffleMode: boolean;
  repeatMode: RepeatMode;

  // Progress
  currentTime: number;
  duration: number;

  // Volume
  volume: number;
  isMuted: boolean;

  // YouTube Player Reference
  playerRef: YouTubePlayer | null;

  // Track Panel State
  trackPanelOpen: boolean;
  trackPanelPlaylist: TrackPanelPlaylist | null;
  trackPanelLoading: boolean;

  // Actions
  setPlayerRef: (ref: YouTubePlayer | null) => void;
  setReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
  setTrack: (track: Track) => void;
  startPlayback: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  playNext: () => void;
  playPrev: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setProgress: (currentTime: number, duration: number) => void;
  seekTo: (percent: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  addToPlaylist: (track: Track) => void;
  removeFromPlaylist: (videoId: string) => void;
  clearPlaylist: () => void;
  onTrackEnd: () => void;

  // Track Panel Actions
  openTrackPanel: (playlist: TrackPanelPlaylist) => void;
  closeTrackPanel: () => void;
  setTrackPanelLoading: (loading: boolean) => void;

  // YouTube Playlist Actions
  loadYouTubePlaylist: (playlistId: string, artistName?: string) => void;
  exitYouTubePlaylistMode: () => void;
}

const usePlayerStore = create<PlayerState>((set, get) => ({
  // Player State
  isPlaying: false,
  isReady: false,
  isLoading: false,

  // Current Track
  currentTrack: null,
  currentIndex: -1,

  // Playlist
  playlist: [],

  // YouTube Playlist Mode
  youtubePlaylistId: null,
  youtubePlaylistMode: false,

  // Modes
  shuffleMode: false,
  repeatMode: 'none',

  // Progress
  currentTime: 0,
  duration: 0,

  // Volume
  volume: 100,
  isMuted: false,

  // YouTube Player Reference
  playerRef: null,

  // Track Panel State
  trackPanelOpen: false,
  trackPanelPlaylist: null,
  trackPanelLoading: false,

  // Actions
  setPlayerRef: (ref) => set({ playerRef: ref }),

  setReady: (ready) => set({ isReady: ready }),

  setLoading: (loading) => set({ isLoading: loading }),

  setTrack: (track) => {
    const { playlist } = get();
    const index = playlist.findIndex((t) => t.videoId === track.videoId);

    if (index === -1) {
      set({
        playlist: [track],
        currentIndex: 0,
        currentTrack: track,
        isPlaying: true,
      });
    } else {
      set({
        currentIndex: index,
        currentTrack: track,
        isPlaying: true,
      });
    }
  },

  startPlayback: (tracks, startIndex = 0) => {
    if (!tracks || tracks.length === 0) return;

    const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
    set({
      playlist: tracks,
      currentIndex: index,
      currentTrack: tracks[index],
      isPlaying: true,
    });
  },

  togglePlay: () => {
    const { isPlaying, currentTrack, playlist } = get();

    if (!currentTrack && playlist.length > 0) {
      set({
        currentIndex: 0,
        currentTrack: playlist[0],
        isPlaying: true,
      });
      return;
    }

    set({ isPlaying: !isPlaying });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  playNext: () => {
    const { playlist, currentIndex, shuffleMode, repeatMode } = get();

    if (playlist.length === 0) return;

    let nextIndex: number;

    if (shuffleMode) {
      if (playlist.length > 1) {
        do {
          nextIndex = secureRandomIndex(playlist.length);
        } while (nextIndex === currentIndex);
      } else {
        nextIndex = 0;
      }
    } else {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex >= playlist.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false, currentIndex: -1, currentTrack: null });
        return;
      }
    }

    set({
      currentIndex: nextIndex,
      currentTrack: playlist[nextIndex],
      isPlaying: true,
    });
  },

  playPrev: () => {
    const { playlist, currentIndex, currentTime, repeatMode } = get();

    if (playlist.length === 0) return;

    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = playlist.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    set({
      currentIndex: prevIndex,
      currentTrack: playlist[prevIndex],
      isPlaying: true,
    });
  },

  toggleShuffle: () => {
    const { shuffleMode, repeatMode } = get();
    set({
      shuffleMode: !shuffleMode,
      repeatMode: shuffleMode ? repeatMode : 'none',
    });
  },

  toggleRepeat: () => {
    const { repeatMode, shuffleMode } = get();
    let nextMode: RepeatMode;
    switch (repeatMode) {
      case 'none':
        nextMode = 'all';
        break;
      case 'all':
        nextMode = 'one';
        break;
      case 'one':
      default:
        nextMode = 'none';
    }
    set({
      repeatMode: nextMode,
      shuffleMode: nextMode !== 'none' ? false : shuffleMode,
    });
  },

  setProgress: (currentTime, duration) => {
    set({ currentTime, duration });
  },

  seekTo: (percent) => {
    const { duration, playerRef } = get();
    if (playerRef && duration > 0) {
      const seekTime = (percent / 100) * duration;
      playerRef.seekTo(seekTime, true);
      set({ currentTime: seekTime });
    }
  },

  setVolume: (volume) => {
    set({ volume, isMuted: volume === 0 });
  },

  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
  },

  addToPlaylist: (track) => {
    const { playlist } = get();
    if (!playlist.find((t) => t.videoId === track.videoId)) {
      set({ playlist: [...playlist, track] });
    }
  },

  removeFromPlaylist: (videoId) => {
    const { playlist, currentTrack, currentIndex } = get();
    const newPlaylist = playlist.filter((t) => t.videoId !== videoId);

    let newIndex = currentIndex;
    let newTrack = currentTrack;

    if (currentTrack?.videoId === videoId) {
      if (newPlaylist.length === 0) {
        newIndex = -1;
        newTrack = null;
      } else {
        newIndex = Math.min(currentIndex, newPlaylist.length - 1);
        newTrack = newPlaylist[newIndex];
      }
    } else if (currentIndex > 0) {
      newIndex = newPlaylist.findIndex((t) => t.videoId === currentTrack?.videoId);
    }

    set({
      playlist: newPlaylist,
      currentIndex: newIndex,
      currentTrack: newTrack,
    });
  },

  clearPlaylist: () => {
    set({
      playlist: [],
      currentIndex: -1,
      currentTrack: null,
      isPlaying: false,
    });
  },

  onTrackEnd: () => {
    const { repeatMode } = get();

    if (repeatMode === 'one') {
      set({ currentTime: 0 });
    } else {
      get().playNext();
    }
  },

  // Track Panel Actions
  openTrackPanel: (playlist) => set({ trackPanelOpen: true, trackPanelPlaylist: playlist }),
  closeTrackPanel: () => set({ trackPanelOpen: false }),
  setTrackPanelLoading: (loading) => set({ trackPanelLoading: loading }),

  // YouTube Playlist Actions - IFrame API가 모든 것을 처리
  loadYouTubePlaylist: (playlistId, artistName) => {
    const { playerRef, isReady, openTrackPanel } = get();

    if (!playerRef || !isReady) {
      console.warn('Player not ready for playlist loading');
      return;
    }

    try {
      // YouTube IFrame API loadPlaylist
      playerRef.loadPlaylist({
        list: playlistId,
        listType: 'playlist',
        index: 0,
        startSeconds: 0,
      });

      set({
        youtubePlaylistId: playlistId,
        youtubePlaylistMode: true,
        isPlaying: true,
        isLoading: true,
        currentTrack: {
          videoId: '',
          title: artistName ? `${artistName} - All Songs` : 'Loading playlist...',
          artist: artistName || 'YouTube Music',
        },
        playlist: [],
        currentIndex: 0,
        trackPanelLoading: true,
      });

      // 트랙 패널 먼저 열기 (로딩 상태)
      openTrackPanel({
        title: artistName ? `${artistName} - All Songs` : 'Playlist',
        author: { name: 'Loading tracks...' },
        tracks: [],
        trackCount: 0,
      });

      // YouTube IFrame에서 playlist 로드 후 video ID 가져오기
      const checkPlaylist = setInterval(async () => {
        try {
          const videoIds = playerRef.getPlaylist();
          if (videoIds && videoIds.length > 0) {
            clearInterval(checkPlaylist);

            // noembed.com으로 각 video의 메타데이터 가져오기
            const tracks: Track[] = [];
            const batchSize = 10;

            for (let i = 0; i < videoIds.length; i += batchSize) {
              const batch = videoIds.slice(i, i + batchSize);
              const batchPromises = batch.map(async (videoId: string) => {
                const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
                try {
                  const res = await fetch(
                    `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
                    { signal: AbortSignal.timeout(5000) }
                  );
                  if (res.ok) {
                    const data = await res.json();
                    return {
                      videoId,
                      title: data.title || 'Unknown',
                      artist: sanitizeArtistName(data.author_name) || artistName || 'Unknown',
                      thumbnail,
                    };
                  }
                } catch {
                  // noembed 실패 시 기본값
                }
                return {
                  videoId,
                  title: `Track ${videoId.slice(0, 6)}`,
                  artist: artistName || 'Unknown',
                  thumbnail,
                };
              });

              const batchResults = await Promise.all(batchPromises);
              tracks.push(...batchResults);

              // 진행 상황 업데이트
              set({ playlist: [...tracks] });
            }

            // 트랙 패널 업데이트
            openTrackPanel({
              title: artistName ? `${artistName} - All Songs` : 'Playlist',
              author: { name: `${tracks.length} tracks` },
              tracks: tracks.map((t) => ({
                videoId: t.videoId,
                title: t.title,
                artists: [{ name: t.artist || '' }],
                thumbnails: t.thumbnail ? [{ url: t.thumbnail }] : [],
              })),
              trackCount: tracks.length,
            });

            set({
              playlist: tracks,
              isLoading: false,
              trackPanelLoading: false,
              currentTrack: tracks[0] || null,
              currentIndex: 0,
            });
          }
        } catch {
          // 아직 로드 중
        }
      }, 500);

      // 10초 타임아웃
      setTimeout(() => {
        clearInterval(checkPlaylist);
        set({ isLoading: false, trackPanelLoading: false });
      }, 10000);
    } catch (error) {
      console.error('Failed to load YouTube playlist:', error);
    }
  },

  exitYouTubePlaylistMode: () => {
    set({
      youtubePlaylistId: null,
      youtubePlaylistMode: false,
    });
  },
}));

export default usePlayerStore;
