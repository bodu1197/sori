'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCharts } from '@/hooks/useMusic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Play, TrendingUp, Music2, User, Globe } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { code: 'ZZ', name: 'Global' },
  { code: 'KR', name: 'Korea' },
  { code: 'US', name: 'USA' },
  { code: 'JP', name: 'Japan' },
  { code: 'GB', name: 'UK' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

export default function ExplorePage() {
  const [country, setCountry] = useState('ZZ');
  const { data: charts, isLoading, error } = useCharts(country);
  const setTrack = usePlayerStore((state) => state.setTrack);

  const handlePlayTrack = (item: { title: string; videoId?: string; artists?: Array<{ name: string; id?: string }>; thumbnails?: Array<{ url: string }> }) => {
    if (item.videoId) {
      setTrack({
        videoId: item.videoId,
        title: item.title,
        artists: item.artists?.map(a => ({ name: a.name, id: a.id || '' })) || [{ name: 'Unknown Artist', id: '' }],
        thumbnail: item.thumbnails?.[0]?.url || '',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Explore</h1>
          <p className="text-muted-foreground">Discover trending music from around the world</p>
        </div>

        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-background border rounded-md px-3 py-2 text-sm"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load charts: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Top Songs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Songs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : charts?.songs?.items ? (
            <div className="space-y-2">
              {charts.songs.items.slice(0, 10).map((item, index) => (
                <div
                  key={item.videoId || index}
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="w-6 text-center text-muted-foreground font-medium">
                    {index + 1}
                  </span>
                  {item.thumbnails?.[0] && (
                    <Image
                      src={item.thumbnails[0].url}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.artists?.map(a => a.name).join(', ')}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handlePlayTrack(item)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No songs available</p>
          )}
        </CardContent>
      </Card>

      {/* Trending Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            Trending Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-video rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : charts?.videos?.items || charts?.trending?.items ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(charts.videos?.items || charts.trending?.items)?.slice(0, 8).map((item, index) => (
                <div
                  key={item.videoId || index}
                  className="group cursor-pointer"
                  onClick={() => handlePlayTrack(item)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    {item.thumbnails?.[0] && (
                      <Image
                        src={item.thumbnails[0].url}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <p className="mt-2 font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.artists?.map(a => a.name).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No videos available</p>
          )}
        </CardContent>
      </Card>

      {/* Top Artists */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Top Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : charts?.artists?.items ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {charts.artists.items.slice(0, 6).map((artist, index) => (
                <Link
                  key={artist.browseId || index}
                  href={`/artist/${artist.browseId}`}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted">
                    {artist.thumbnails?.[0] && (
                      <Image
                        src={artist.thumbnails[0].url}
                        alt={artist.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="font-medium text-center truncate w-full">{artist.title}</p>
                  {artist.subscribers && (
                    <p className="text-xs text-muted-foreground">{artist.subscribers}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No artists available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
