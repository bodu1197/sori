// @ts-nocheck
import React, { useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Loader2 } from 'lucide-react';
import usePlayerStore from '../../stores/usePlayerStore';
import YouTubePlayer from './YouTubePlayer';

/**
 * Format seconds to mm:ss
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MiniPlayer() {
  const {
    isPlaying,
    isLoading,
    currentTrack,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
  } = usePlayerStore();

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (!duration || duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  // Handle progress bar click
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = (clickX / rect.width) * 100;
    seekTo(Math.max(0, Math.min(100, percent)));
  };

  // Get thumbnail URL - handle both 'cover' and 'thumbnail' fields
  const thumbnailUrl = currentTrack?.cover || currentTrack?.thumbnail || '/default-album.png';

  if (!currentTrack) return <YouTubePlayer />;

  return (
    <>
      {/* Hidden YouTube Player */}
      <YouTubePlayer />

      {/* Mini Player UI */}
      <div className="h-[60px] bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 flex items-center px-4 justify-between sticky bottom-[50px] z-40 shadow-lg">
        {/* Track Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={thumbnailUrl}
            alt="Album Art"
            className={`w-10 h-10 rounded-md object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
            style={{ animationDuration: '10s' }}
            onError={(e) => {
              e.target.src = '/default-album.png';
            }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate dark:text-white leading-tight">
              {currentTrack.title || 'Unknown Track'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
              {currentTrack.artist || 'Unknown Artist'}
            </span>
          </div>
        </div>

        {/* Time Display */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mx-4">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Previous */}
          <button
            onClick={playPrev}
            className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-1"
            title="Previous"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-black dark:text-white p-1"
            disabled={isLoading}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-1"
            title="Next"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>

        {/* Progress Bar (Clickable) */}
        <div
          className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-200 dark:bg-gray-800 cursor-pointer group"
          onClick={handleProgressClick}
        >
          {/* Progress Fill */}
          <div
            className="h-full bg-black dark:bg-white transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Hover Indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-black dark:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>
      </div>
    </>
  );
}
