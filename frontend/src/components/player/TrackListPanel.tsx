import { useEffect, useRef, useCallback } from 'react';
import { Play, Shuffle, X, ChevronRight } from 'lucide-react';
import usePlayerStore from '../../stores/usePlayerStore';

declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayerOptions {
  height?: string;
  width?: string;
  videoId?: string;
  playerVars?: {
    playsinline?: number;
    controls?: number;
    disablekb?: number;
    fs?: number;
    iv_load_policy?: number;
    modestbranding?: number;
    rel?: number;
    origin?: string;
    autoplay?: number;
  };
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTStateChangeEvent) => void;
    onError?: (event: YTErrorEvent) => void;
  };
}

interface YTPlayer {
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

interface YTStateChangeEvent {
  data: number;
  target: YTPlayer;
}

interface YTErrorEvent {
  data: number;
  target: YTPlayer;
}

export interface PlaylistTrack {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  duration?: string;
  album?: { name?: string; id?: string };
  isAvailable?: boolean;
}

export interface PlaylistData {
  title: string;
  description?: string;
  author?: { name: string };
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  tracks: PlaylistTrack[];
  trackCount?: number;
}

interface TrackListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistData | null;
  loading: boolean;
  onPlayTrack: (track: PlaylistTrack, index: number, allTracks: PlaylistTrack[]) => void;
  onPlayAll: () => void;
  onShuffleAll: () => void;
  currentVideoId?: string;
  isPlaying: boolean;
}

function getBestThumbnail(
  thumbnails?: Array<{ url: string; width?: number; height?: number }>
): string | null {
  if (!thumbnails || thumbnails.length === 0) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
}

export default function TrackListPanel({
  isOpen,
  onClose,
  playlist,
  loading,
  onPlayTrack,
  onPlayAll,
  onShuffleAll,
  currentVideoId,
  isPlaying,
}: TrackListPanelProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayerReadyRef = useRef(false);

  const {
    currentTrack,
    isPlaying: storeIsPlaying,
    volume,
    isMuted,
    setPlayerRef,
    setReady,
    setLoading,
    setProgress,
    onTrackEnd,
  } = usePlayerStore();

  // Find current playing track info
  const currentTrackInfo = playlist?.tracks.find((t) => t.videoId === currentVideoId);

  const stopProgressUpdater = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressUpdater = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();
          if (duration > 0) {
            setProgress(currentTime, duration);
          }
        } catch {
          // Progress update error
        }
      }
    }, 1000);
  }, [setProgress]);

  const handleTrackEnd = useCallback(() => {
    const { repeatMode } = usePlayerStore.getState();

    if (repeatMode === 'one') {
      if (playerRef.current) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
    } else {
      onTrackEnd();
    }
  }, [onTrackEnd]);

  const handlePlayerReady = useCallback(
    (event: YTPlayerEvent) => {
      isPlayerReadyRef.current = true;
      setPlayerRef(event.target as unknown as Parameters<typeof setPlayerRef>[0]);
      setReady(true);

      if (event.target) {
        event.target.setVolume(volume);
        if (isMuted) {
          event.target.mute();
        }
      }

      // If there's a current track, load it
      const state = usePlayerStore.getState();
      if (state.currentTrack?.videoId) {
        event.target.loadVideoById(state.currentTrack.videoId, 0);
      }
    },
    [setPlayerRef, setReady, volume, isMuted]
  );

  const handleStateChange = useCallback(
    (event: YTStateChangeEvent) => {
      const state = event.data;

      switch (state) {
        case window.YT.PlayerState.PLAYING:
          setLoading(false);
          startProgressUpdater();
          break;
        case window.YT.PlayerState.PAUSED:
          stopProgressUpdater();
          break;
        case window.YT.PlayerState.BUFFERING:
          setLoading(true);
          break;
        case window.YT.PlayerState.ENDED:
          stopProgressUpdater();
          handleTrackEnd();
          break;
        case window.YT.PlayerState.UNSTARTED:
          setLoading(true);
          break;
      }
    },
    [setLoading, startProgressUpdater, stopProgressUpdater, handleTrackEnd]
  );

  const handlePlayerError = useCallback(
    (_event: YTErrorEvent) => {
      setLoading(false);
      usePlayerStore.getState().playNext();
    },
    [setLoading]
  );

  const initializePlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '100%',
      width: '100%',
      playerVars: {
        playsinline: 1,
        controls: 1,
        disablekb: 0,
        fs: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
        autoplay: 1,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handleStateChange,
        onError: handlePlayerError,
      },
    });
  }, [handlePlayerReady, handleStateChange, handlePlayerError]);

  // Initialize YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initializePlayer();
      return;
    }

    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      window.onYouTubeIframeAPIReady = initializePlayer;
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = initializePlayer;

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [initializePlayer]);

  // Load video when currentTrack changes
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current || !currentTrack?.videoId) return;

    setLoading(true);

    try {
      playerRef.current.loadVideoById(currentTrack.videoId, 0);
    } catch {
      setLoading(false);
    }
  }, [currentTrack?.videoId, setLoading]);

  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;

    try {
      if (storeIsPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // Play/pause error
    }
  }, [storeIsPlaying]);

  // Handle volume
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;

    try {
      playerRef.current.setVolume(volume);
    } catch {
      // Volume error
    }
  }, [volume]);

  // Handle mute
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;

    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch {
      // Mute error
    }
  }, [isMuted]);

  // Always render but use visibility to hide
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ visibility: isOpen ? 'visible' : 'hidden' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s' }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-[430px] bg-white dark:bg-gray-900 rounded-t-2xl h-[100dvh] overflow-hidden flex flex-col"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* YouTube Video Player Container */}
        <div className="w-full bg-black flex-shrink-0">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <div
              ref={containerRef}
              id="popup-video-container"
              className="absolute inset-0 w-full h-full"
            />
          </div>
          {/* Current Track Info */}
          {currentTrackInfo && (
            <div className="px-4 py-2 bg-gray-900 text-white">
              <div className="font-medium text-sm truncate">{currentTrackInfo.title}</div>
              <div className="text-xs text-gray-400 truncate">
                {currentTrackInfo.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
              </div>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {playlist?.thumbnails && (
                <img
                  src={getBestThumbnail(playlist.thumbnails) || 'https://via.placeholder.com/48'}
                  alt={playlist?.title || 'Playlist'}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate dark:text-white">
                  {playlist?.title || 'Loading...'}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {playlist?.author?.name || ''}{' '}
                  {playlist?.trackCount ? `${playlist.trackCount} tracks` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Play Controls */}
          {playlist && playlist.tracks.length > 0 && (
            <div className="flex gap-2 px-4 pb-3">
              <button
                onClick={onPlayAll}
                className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-full font-semibold hover:opacity-80 transition"
              >
                <Play size={18} fill="currentColor" /> Play All
              </button>
              <button
                onClick={onShuffleAll}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 dark:text-white py-2.5 rounded-full font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <Shuffle size={18} /> Shuffle
              </button>
            </div>
          )}
        </div>

        {/* Track List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
            </div>
          ) : playlist && playlist.tracks.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 pb-[120px]">
              {playlist.tracks.map((track, index) => {
                const isCurrentTrack = currentVideoId === track.videoId;
                const isTrackPlaying = isCurrentTrack && isPlaying;

                return (
                  <div
                    key={track.videoId || index}
                    onClick={() => track.videoId && onPlayTrack(track, index, playlist.tracks)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      isCurrentTrack
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${!track.videoId || track.isAvailable === false ? 'opacity-50' : ''}`}
                  >
                    {/* Index / Playing Indicator */}
                    <div className="w-6 flex-shrink-0 text-center">
                      {isTrackPlaying ? (
                        <div className="flex gap-0.5 justify-center">
                          <div
                            className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">{index + 1}</span>
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-10 h-10 flex-shrink-0">
                      <img
                        src={getBestThumbnail(track.thumbnails) || 'https://via.placeholder.com/40'}
                        alt={track.title}
                        className="w-full h-full rounded object-cover"
                      />
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium text-sm truncate ${isCurrentTrack ? 'text-black dark:text-white' : 'dark:text-gray-300'}`}
                      >
                        {track.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {track.duration || ''}
                    </div>

                    {/* Play Button */}
                    <button className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500">No tracks available</div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { TrackListPanelProps };
