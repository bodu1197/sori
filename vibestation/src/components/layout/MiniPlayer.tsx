'use client';

import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePlayerStore } from '@/stores';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    togglePlay,
    playNext,
    playPrevious,
    setVolume,
  } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur md:bottom-0">
      <div className="container flex h-20 items-center gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
            <Image
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{currentTrack.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {currentTrack.artists.map((a) => a.name).join(', ')}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={playPrevious}
            className="hidden sm:flex"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={togglePlay}
            className="h-12 w-12 rounded-full"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            className="hidden sm:flex"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Volume (Desktop) */}
        <div className="hidden md:flex items-center gap-2 w-32">
          <Volume2 className="h-5 w-5 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(value) => setVolume(value[0])}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}
