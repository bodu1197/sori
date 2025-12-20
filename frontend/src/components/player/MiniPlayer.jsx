import React from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';
import usePlayerStore from '../../stores/usePlayerStore';

export default function MiniPlayer() {
  const { isPlaying, currentTrack, togglePlay } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <div className="h-[60px] bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 flex items-center px-4 justify-between sticky bottom-[50px] z-40 shadow-lg">
      {/* Track Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <img
          src={currentTrack.cover}
          alt="Art"
          className={`w-10 h-10 rounded-md object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
          style={{ animationDuration: '10s' }}
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate dark:text-white leading-tight">
            {currentTrack.title}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
            {currentTrack.artist}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Like Button (Optional) */}
        {/* <Heart size={20} className="text-gray-500" /> */}

        <button onClick={togglePlay} className="text-black dark:text-white">
          {isPlaying ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" />
          )}
        </button>

        <button className="text-gray-500 dark:text-gray-400">
          <SkipForward size={24} fill="currentColor" />
        </button>
      </div>

      {/* Progress Bar (Thin line at bottom) */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-200 dark:bg-gray-800">
        <div className="h-full bg-black dark:bg-white w-1/3"></div>
      </div>
    </div>
  );
}
