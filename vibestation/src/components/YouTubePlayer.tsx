'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          height: string;
          width: string;
          videoId: string;
          playerVars: Record<string, number>;
          events: {
            onReady: (event: { target: YouTubePlayerType }) => void;
            onStateChange: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayerType;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerType {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (videoId: string) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

export default function YouTubePlayer() {
  const { currentTrack, isPlaying, pause, resume, playNext, playPrevious } = usePlayer();
  const playerRef = useRef<YouTubePlayerType | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsReady(true);
      };
    } else {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (isReady && currentTrack && !playerRef.current) {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: currentTrack.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            if (isPlaying) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              playNext();
            }
          },
        },
      });
    } else if (playerRef.current && currentTrack) {
      playerRef.current.loadVideoById(currentTrack.videoId);
    }
  }, [isReady, currentTrack, isPlaying, playNext]);

  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  function toggleMute() {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.setVolume(100);
      } else {
        playerRef.current.setVolume(0);
      }
      setIsMuted(!isMuted);
    }
  }

  if (!currentTrack) return null;

  return (
    <>
      <div id="youtube-player" className="hidden" />

      <div className={`fixed ${isMinimized ? 'bottom-4 right-4 w-72' : 'bottom-0 left-0 right-0'} bg-zinc-900 border-t border-zinc-800 z-50 transition-all`}>
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {currentTrack.thumbnail && (
                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{currentTrack.title}</p>
                <p className="text-sm text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={playPrevious}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={isPlaying ? pause : resume}
                className="p-3 bg-white text-black rounded-full hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="black" />}
              </button>
              <button
                onClick={playNext}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Volume & Close */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 text-zinc-400 hover:text-white transition-colors md:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
