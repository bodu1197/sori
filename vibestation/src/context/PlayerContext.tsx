'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Track {
  videoId: string;
  title: string;
  artist: string;
  thumbnail?: string;
  duration?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  addToQueue: (track: Track) => void;
  playNext: () => void;
  playPrevious: () => void;
  setQueue: (tracks: Track[]) => void;
}

const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null,
  isPlaying: false,
  queue: [],
  play: () => {},
  pause: () => {},
  resume: () => {},
  addToQueue: () => {},
  playNext: () => {},
  playPrevious: () => {},
  setQueue: () => {},
});

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  function play(track: Track) {
    setCurrentTrack(track);
    setIsPlaying(true);
  }

  function pause() {
    setIsPlaying(false);
  }

  function resume() {
    setIsPlaying(true);
  }

  function addToQueue(track: Track) {
    setQueueState(prev => [...prev, track]);
  }

  function setQueue(tracks: Track[]) {
    setQueueState(tracks);
    if (tracks.length > 0) {
      setCurrentTrack(tracks[0]);
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }

  function playNext() {
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentTrack(queue[nextIndex]);
      setIsPlaying(true);
    }
  }

  function playPrevious() {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentTrack(queue[prevIndex]);
      setIsPlaying(true);
    }
  }

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      play,
      pause,
      resume,
      addToQueue,
      playNext,
      playPrevious,
      setQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
