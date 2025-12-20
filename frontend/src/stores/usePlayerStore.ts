import { create } from 'zustand';

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
          nextIndex = Math.floor(Math.random() * playlist.length);
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
}));

export default usePlayerStore;
