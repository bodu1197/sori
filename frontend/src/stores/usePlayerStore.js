// @ts-nocheck
import { create } from 'zustand';

/**
 * YouTube Music Player Store
 * sample/js/player.js 기능을 React/Zustand로 구현
 */
const usePlayerStore = create((set, get) => ({
  // Player State
  isPlaying: false,
  isReady: false,
  isLoading: false,

  // Current Track
  currentTrack: null, // { videoId, title, artist, thumbnail, duration }
  currentIndex: -1,

  // Playlist
  playlist: [],

  // Modes
  shuffleMode: false,
  repeatMode: 'none', // 'none' | 'all' | 'one'

  // Progress
  currentTime: 0,
  duration: 0,

  // Volume
  volume: 100,
  isMuted: false,

  // YouTube Player Reference (set by MiniPlayer component)
  playerRef: null,

  // ==================== Actions ====================

  setPlayerRef: (ref) => set({ playerRef: ref }),

  setReady: (ready) => set({ isReady: ready }),

  setLoading: (loading) => set({ isLoading: loading }),

  // Set current track and start playing
  setTrack: (track) => {
    const { playlist } = get();
    let index = playlist.findIndex((t) => t.videoId === track.videoId);

    // If track not in playlist, add it
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

  // Start playback with a new playlist
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

  // Toggle play/pause
  togglePlay: () => {
    const { isPlaying, currentTrack, playlist } = get();

    if (!currentTrack && playlist.length > 0) {
      // No current track but playlist exists - start from beginning
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

  // Play next track
  playNext: () => {
    const { playlist, currentIndex, shuffleMode, repeatMode } = get();

    if (playlist.length === 0) return;

    let nextIndex;

    if (shuffleMode) {
      // Random track (avoid same track if possible)
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

    // Handle end of playlist
    if (nextIndex >= playlist.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        // Stop playback
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

  // Play previous track
  playPrev: () => {
    const { playlist, currentIndex, currentTime, repeatMode } = get();

    if (playlist.length === 0) return;

    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 });
      // Seek to beginning will be handled by MiniPlayer
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

  // Toggle shuffle mode
  toggleShuffle: () => {
    const { shuffleMode, repeatMode } = get();
    // Turn off repeat when enabling shuffle
    set({
      shuffleMode: !shuffleMode,
      repeatMode: shuffleMode ? repeatMode : 'none',
    });
  },

  // Cycle repeat mode: none -> all -> one -> none
  toggleRepeat: () => {
    const { repeatMode, shuffleMode } = get();
    let nextMode;
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
    // Turn off shuffle when enabling repeat
    set({
      repeatMode: nextMode,
      shuffleMode: nextMode !== 'none' ? false : shuffleMode,
    });
  },

  // Update progress
  setProgress: (currentTime, duration) => {
    set({ currentTime, duration });
  },

  // Seek to position (0-100)
  seekTo: (percent) => {
    const { duration, playerRef } = get();
    if (playerRef && duration > 0) {
      const seekTime = (percent / 100) * duration;
      playerRef.seekTo(seekTime, true);
      set({ currentTime: seekTime });
    }
  },

  // Volume control
  setVolume: (volume) => {
    set({ volume, isMuted: volume === 0 });
  },

  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
  },

  // Add track to playlist
  addToPlaylist: (track) => {
    const { playlist } = get();
    // Check if already exists
    if (!playlist.find((t) => t.videoId === track.videoId)) {
      set({ playlist: [...playlist, track] });
    }
  },

  // Remove track from playlist
  removeFromPlaylist: (videoId) => {
    const { playlist, currentTrack, currentIndex } = get();
    const newPlaylist = playlist.filter((t) => t.videoId !== videoId);

    // Adjust current index if needed
    let newIndex = currentIndex;
    let newTrack = currentTrack;

    if (currentTrack?.videoId === videoId) {
      // Current track was removed
      if (newPlaylist.length === 0) {
        newIndex = -1;
        newTrack = null;
      } else {
        newIndex = Math.min(currentIndex, newPlaylist.length - 1);
        newTrack = newPlaylist[newIndex];
      }
    } else if (currentIndex > 0) {
      // Recalculate index
      newIndex = newPlaylist.findIndex((t) => t.videoId === currentTrack?.videoId);
    }

    set({
      playlist: newPlaylist,
      currentIndex: newIndex,
      currentTrack: newTrack,
    });
  },

  // Clear playlist
  clearPlaylist: () => {
    set({
      playlist: [],
      currentIndex: -1,
      currentTrack: null,
      isPlaying: false,
    });
  },

  // Handle track end
  onTrackEnd: () => {
    const { repeatMode } = get();

    if (repeatMode === 'one') {
      // Replay current track - just trigger re-render
      set({ currentTime: 0 });
    } else {
      get().playNext();
    }
  },
}));

export default usePlayerStore;
