// @ts-nocheck
import { create } from 'zustand';

const usePlayerStore = create((set) => ({
  isPlaying: false,
  currentTrack: null, // { title, artist, cover, url }
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setTrack: (track) => set({ currentTrack: track, isPlaying: true }),
}));

export default usePlayerStore;
