import { useEffect, useRef, useCallback } from 'react';
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

export default function YouTubePlayer() {
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  } = usePlayerStore();

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
      setPlayerRef(event.target as unknown as Parameters<typeof setPlayerRef>[0]);
      setReady(true);

      if (event.target) {
        event.target.setVolume(volume);
        if (isMuted) {
          event.target.mute();
        }
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
      height: '200',
      width: '200',
      playerVars: {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handleStateChange,
        onError: handlePlayerError,
      },
    });
  }, [handlePlayerReady, handleStateChange, handlePlayerError]);

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

  useEffect(() => {
    if (!playerRef.current || !currentTrack?.videoId) return;

    setLoading(true);

    try {
      playerRef.current.loadVideoById(currentTrack.videoId, 0);
    } catch {
      setLoading(false);
    }
  }, [currentTrack?.videoId, setLoading]);

  useEffect(() => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {
      // Play/pause error
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!playerRef.current) return;

    try {
      playerRef.current.setVolume(volume);
    } catch {
      // Volume error
    }
  }, [volume]);

  useEffect(() => {
    if (!playerRef.current) return;

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

  return (
    <div
      ref={containerRef}
      id="youtube-player-container"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: 200,
        height: 200,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
}
