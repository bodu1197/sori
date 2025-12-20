// @ts-nocheck
import { useEffect, useRef, useCallback } from 'react';
import usePlayerStore from '../../stores/usePlayerStore';

/**
 * Hidden YouTube IFrame Player Component
 * Handles actual YouTube video playback behind the scenes
 */
export default function YouTubePlayer() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const progressIntervalRef = useRef(null);

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

  // Define helper functions first (before they're used)
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
        } catch (e) {
          console.error('[YouTubePlayer] Progress update error:', e);
        }
      }
    }, 1000);
  }, [setProgress]);

  const handleTrackEnd = useCallback(() => {
    const { repeatMode } = usePlayerStore.getState();

    if (repeatMode === 'one') {
      // Replay current track
      if (playerRef.current) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
    } else {
      onTrackEnd();
    }
  }, [onTrackEnd]);

  // Now define handlers that use the above functions
  const handlePlayerReady = useCallback(
    (event) => {
      console.log('[YouTubePlayer] Player ready');
      setPlayerRef(event.target);
      setReady(true);

      // Apply initial volume
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
    (event) => {
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
    (event) => {
      console.error('[YouTubePlayer] Error:', event.data);
      setLoading(false);
      // Try next track on error
      usePlayerStore.getState().playNext();
    },
    [setLoading]
  );

  const initializePlayer = useCallback(() => {
    if (!containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '0',
      width: '0',
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

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initializePlayer();
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      // Wait for it to load
      window.onYouTubeIframeAPIReady = initializePlayer;
      return;
    }

    // Load the API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = initializePlayer;

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [initializePlayer]);

  // Handle track changes
  useEffect(() => {
    if (!playerRef.current || !currentTrack?.videoId) return;

    console.log('[YouTubePlayer] Loading track:', currentTrack?.title);
    setLoading(true);

    try {
      playerRef.current.loadVideoById(currentTrack.videoId, 0);
    } catch (e) {
      console.error('[YouTubePlayer] Error loading video:', e);
      setLoading(false);
    }
  }, [currentTrack?.videoId, currentTrack?.title, setLoading]);

  // Handle play/pause state
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      console.error('[YouTubePlayer] Play/pause error:', e);
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      playerRef.current.setVolume(volume);
    } catch (e) {
      console.error('[YouTubePlayer] Volume error:', e);
    }
  }, [volume]);

  // Handle mute changes
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch (e) {
      console.error('[YouTubePlayer] Mute error:', e);
    }
  }, [isMuted]);

  return (
    <div
      ref={containerRef}
      id="youtube-player-container"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
}
