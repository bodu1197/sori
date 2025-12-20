import { useMemo, useState, ChangeEvent, MouseEvent } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Loader2,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import usePlayerStore from '../../stores/usePlayerStore';

function formatTime(seconds: number): string {
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
    volume,
    isMuted,
    shuffleMode,
    repeatMode,
    playlist,
    togglePlay,
    playNext,
    playPrev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    openTrackPanel,
  } = usePlayerStore();

  const [isExpanded, setIsExpanded] = useState(false);

  const progressPercent = useMemo(() => {
    if (!duration || duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = (clickX / rect.width) * 100;
    seekTo(Math.max(0, Math.min(100, percent)));
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVolume(parseInt(e.target.value, 10));
  };

  const thumbnailUrl =
    currentTrack?.cover ||
    currentTrack?.thumbnail ||
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop';

  // Open popup with current playlist
  const handleOpenPlaylist = () => {
    if (playlist.length === 0) return;

    openTrackPanel({
      title: 'Now Playing',
      author: { name: `${playlist.length} tracks` },
      tracks: playlist.map((t) => ({
        videoId: t.videoId,
        title: t.title,
        artists: t.artist ? [{ name: t.artist }] : [{ name: 'Unknown Artist' }],
        thumbnails: t.thumbnail ? [{ url: t.thumbnail }] : undefined,
      })),
      trackCount: playlist.length,
    });
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'one') {
      return <Repeat1 size={18} className="text-black dark:text-white" />;
    }
    return (
      <Repeat
        size={18}
        className={repeatMode === 'all' ? 'text-black dark:text-white' : 'text-gray-400'}
      />
    );
  };

  if (!currentTrack) return null;

  return (
    <div
      className={`bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800 sticky bottom-[50px] z-[60] shadow-lg transition-all duration-300 ${
        isExpanded ? 'h-[120px]' : 'h-[60px]'
      }`}
    >
      <div className="h-[60px] flex items-center px-4 justify-between">
        {/* Clickable area to open playlist popup */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={handleOpenPlaylist}
        >
          <img
            src={thumbnailUrl}
            alt="Album Art"
            className="w-10 h-10 rounded-md object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop';
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

        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mx-4">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={playPrev}
            className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-1"
            title="Previous"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

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

          <button
            onClick={playNext}
            className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-1"
            title="Next"
          >
            <SkipForward size={24} fill="currentColor" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-black dark:hover:text-white p-1 ml-1"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        <div
          className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-200 dark:bg-gray-800 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-black dark:bg-white transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-black dark:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="h-[60px] flex items-center justify-between px-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full transition-colors ${
                shuffleMode
                  ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                  : 'text-gray-400 hover:text-black dark:hover:text-white'
              }`}
              title={shuffleMode ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle size={18} />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-2 rounded-full transition-colors ${
                repeatMode !== 'none'
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : 'hover:text-black dark:hover:text-white'
              }`}
              title={`Repeat: ${repeatMode === 'none' ? 'Off' : repeatMode === 'all' ? 'All' : 'One'}`}
            >
              {getRepeatIcon()}
            </button>
          </div>

          <div className="flex sm:hidden items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
              title={`Volume: ${volume}%`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
