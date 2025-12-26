import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song } from '@/types';

interface PlayerState {
  currentTrack: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  repeat: 'off' | 'one' | 'all';
  shuffle: boolean;
  duration: number;
  currentTime: number;

  // Actions
  setTrack: (track: Song) => void;
  setQueue: (queue: Song[], startIndex?: number) => void;
  addToQueue: (track: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      volume: 80,
      repeat: 'off',
      shuffle: false,
      duration: 0,
      currentTime: 0,

      setTrack: (track) =>
        set({
          currentTrack: track,
          isPlaying: true,
          currentTime: 0,
        }),

      setQueue: (queue, startIndex = 0) =>
        set({
          queue,
          queueIndex: startIndex,
          currentTrack: queue[startIndex] || null,
          isPlaying: true,
          currentTime: 0,
        }),

      addToQueue: (track) =>
        set((state) => ({
          queue: [...state.queue, track],
        })),

      removeFromQueue: (index) =>
        set((state) => ({
          queue: state.queue.filter((_, i) => i !== index),
          queueIndex:
            index < state.queueIndex
              ? state.queueIndex - 1
              : state.queueIndex,
        })),

      clearQueue: () =>
        set({
          queue: [],
          queueIndex: 0,
          currentTrack: null,
          isPlaying: false,
        }),

      playNext: () => {
        const { queue, queueIndex, repeat, shuffle } = get();
        if (queue.length === 0) return;

        let nextIndex: number;

        if (shuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (queueIndex < queue.length - 1) {
          nextIndex = queueIndex + 1;
        } else if (repeat === 'all') {
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          return;
        }

        set({
          queueIndex: nextIndex,
          currentTrack: queue[nextIndex],
          currentTime: 0,
        });
      },

      playPrevious: () => {
        const { queue, queueIndex, currentTime } = get();
        if (queue.length === 0) return;

        // 3초 이상 재생됐으면 처음으로
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
        set({
          queueIndex: prevIndex,
          currentTrack: queue[prevIndex],
          currentTime: 0,
        });
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      toggleRepeat: () =>
        set((state) => ({
          repeat:
            state.repeat === 'off'
              ? 'all'
              : state.repeat === 'all'
              ? 'one'
              : 'off',
        })),
      toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
      setDuration: (duration) => set({ duration }),
      setCurrentTime: (currentTime) => set({ currentTime }),
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        volume: state.volume,
        repeat: state.repeat,
        shuffle: state.shuffle,
      }),
    }
  )
);
