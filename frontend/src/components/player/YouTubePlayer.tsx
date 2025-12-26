import { useEffect, useRef, useCallback } from 'react';
import usePlayerStore from '../../stores/usePlayerStore';

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          height: string;
          width: string;
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YouTubePlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayerInstance;
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

interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  cueVideoById: (videoId: string, startSeconds?: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getPlaylist: () => string[];
  getPlaylistIndex: () => number;
  playVideoAt: (index: number) => void;
  loadPlaylist: (options: {
    list: string;
    listType: 'playlist' | 'user_uploads';
    index?: number;
    startSeconds?: number;
  }) => void;
  destroy: () => void;
}

export default function YouTubePlayer() {
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVideoIdRef = useRef<string | null>(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    setPlayerRef,
    setReady,
    setLoading,
    setProgress,
    onTrackEnd,
    play,
    pause,
  } = usePlayerStore();

  // Stop progress tracking helper
  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Start progress tracking helper
  const startProgressTracking = useCallback(
    (player: YouTubePlayerInstance) => {
      stopProgressTracking();
      progressIntervalRef.current = setInterval(() => {
        try {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          if (currentTime !== undefined && duration !== undefined) {
            setProgress(currentTime, duration);
          }
        } catch {
          // Player may be destroyed
        }
      }, 250);
    },
    [setProgress, stopProgressTracking]
  );

  // Player error handler
  const onPlayerError = useCallback(
    (event: { data: number }) => {
      console.error('YouTube Player Error:', event.data);
      setLoading(false);
      // Auto-skip on error (video unavailable, etc.)
      if ([2, 5, 100, 101, 150].includes(event.data)) {
        onTrackEnd();
      }
    },
    [setLoading, onTrackEnd]
  );

  // Player state change handler
  const onPlayerStateChange = useCallback(
    (event: { data: number; target: YouTubePlayerInstance }) => {
      const state = event.data;

      switch (state) {
        case window.YT.PlayerState.PLAYING:
          setLoading(false);
          play();
          startProgressTracking(event.target);
          break;
        case window.YT.PlayerState.PAUSED:
          pause();
          stopProgressTracking();
          break;
        case window.YT.PlayerState.ENDED:
          stopProgressTracking();
          onTrackEnd();
          break;
        case window.YT.PlayerState.BUFFERING:
          setLoading(true);
          break;
        case window.YT.PlayerState.CUED:
          setLoading(false);
          break;
      }
    },
    [setLoading, play, pause, onTrackEnd, startProgressTracking, stopProgressTracking]
  );

  // Player ready handler
  const onPlayerReady = useCallback(
    (event: { target: YouTubePlayerInstance }) => {
      setReady(true);
      setPlayerRef({
        seekTo: (seconds: number, allowSeekAhead?: boolean) =>
          event.target.seekTo(seconds, allowSeekAhead),
        setVolume: (vol: number) => event.target.setVolume(vol),
        mute: () => event.target.mute(),
        unMute: () => event.target.unMute(),
        loadPlaylist: (options) => event.target.loadPlaylist(options),
        getPlaylist: () => event.target.getPlaylist(),
        getPlaylistIndex: () => event.target.getPlaylistIndex(),
        playVideoAt: (index: number) => event.target.playVideoAt(index),
      });
      event.target.setVolume(volume);
      if (isMuted) {
        event.target.mute();
      }
    },
    [setReady, setPlayerRef, volume, isMuted]
  );

  // Initialize player
  const initPlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;

    const player = new window.YT.Player('youtube-player', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    });

    playerRef.current = player;
  }, [onPlayerReady, onPlayerStateChange, onPlayerError]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      stopProgressTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [initPlayer, stopProgressTracking]);

  // Load video when currentTrack changes
  useEffect(() => {
    if (!playerRef.current || !currentTrack?.videoId) return;

    // Skip if same video
    if (lastVideoIdRef.current === currentTrack.videoId) {
      return;
    }

    lastVideoIdRef.current = currentTrack.videoId;
    setLoading(true);

    try {
      playerRef.current.loadVideoById(currentTrack.videoId, 0);
    } catch (error) {
      console.error('Failed to load video:', error);
      setLoading(false);
    }
  }, [currentTrack?.videoId, setLoading]);

  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      const state = playerRef.current.getPlayerState();
      if (isPlaying && state !== window.YT?.PlayerState?.PLAYING) {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === window.YT?.PlayerState?.PLAYING) {
        playerRef.current.pauseVideo();
      }
    } catch {
      // Player may not be ready
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      playerRef.current.setVolume(volume);
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch {
      // Player may not be ready
    }
  }, [volume, isMuted]);

  return (
    <div
      ref={containerRef}
      className="fixed -top-[9999px] -left-[9999px] w-[1px] h-[1px] overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div id="youtube-player" />
    </div>
  );
}
