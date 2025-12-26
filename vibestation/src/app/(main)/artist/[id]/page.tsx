'use client';

import { use } from 'react';
import Image from 'next/image';
import { useArtist } from '@/hooks/useMusic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Play, Shuffle, UserPlus, Music2, Disc, Video, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const { id } = use(params);
  const { data: artist, isLoading, error } = useArtist(id);
  const setTrack = usePlayerStore((state) => state.setTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);

  const handlePlaySong = (song: { videoId?: string; title: string; artists?: Array<{ name: string; id?: string }>; thumbnails?: Array<{ url: string }>; duration?: string }) => {
    if (song.videoId) {
      setTrack({
        videoId: song.videoId,
        title: song.title,
        artists: song.artists?.map(a => ({ name: a.name, id: a.id || '' })) || [{ name: artist?.name || 'Unknown', id: '' }],
        thumbnail: song.thumbnails?.[0]?.url || '',
        duration: song.duration,
      });
    }
  };

  const handlePlayAll = () => {
    if (artist?.songs?.results) {
      const tracks = artist.songs.results
        .filter((s) => s.videoId)
        .map((s) => ({
          videoId: s.videoId!,
          title: s.title,
          artists: s.artists?.map((a) => ({ name: a.name, id: a.id || '' })) || [{ name: artist.name, id: '' }],
          thumbnail: s.thumbnails?.[0]?.url || '',
          duration: s.duration,
        }));

      if (tracks.length > 0) {
        setQueue(tracks, 0);
      }
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-4">Failed to load artist: {error.message}</p>
        <Link href="/explore">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Explore
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link href="/explore">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      {/* Artist Header */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
        {isLoading ? (
          <>
            <Skeleton className="h-48 w-48 rounded-full" />
            <div className="space-y-2 text-center md:text-left">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </>
        ) : (
          <>
            <div className="relative h-48 w-48 rounded-full overflow-hidden bg-muted shrink-0">
              {artist?.thumbnails?.[0] && (
                <Image
                  src={artist.thumbnails[0].url}
                  alt={artist.name}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold">{artist?.name}</h1>
              {artist?.subscribers && (
                <p className="text-muted-foreground">{artist.subscribers} subscribers</p>
              )}
              {artist?.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl line-clamp-3">
                  {artist.description}
                </p>
              )}
              <div className="flex gap-3 mt-4 justify-center md:justify-start">
                <Button onClick={handlePlayAll}>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>
                <Button variant="outline" onClick={handlePlayAll}>
                  <Shuffle className="h-4 w-4 mr-2" />
                  Shuffle
                </Button>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top Songs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            Top Songs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : artist?.songs?.results ? (
            <div className="space-y-2">
              {artist.songs.results.slice(0, 10).map((song, index) => (
                <div
                  key={song.videoId || index}
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="w-6 text-center text-muted-foreground">{index + 1}</span>
                  {song.thumbnails?.[0] && (
                    <Image
                      src={song.thumbnails[0].url}
                      alt={song.title}
                      width={48}
                      height={48}
                      className="rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    {song.album && (
                      <p className="text-sm text-muted-foreground truncate">{song.album.name}</p>
                    )}
                  </div>
                  {song.duration && (
                    <span className="text-sm text-muted-foreground">{song.duration}</span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handlePlaySong(song)}
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

      {/* Albums */}
      {artist?.albums?.results && artist.albums.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Disc className="h-5 w-5 text-primary" />
              Albums
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {artist.albums.results.map((album, index) => (
                <div key={album.browseId || index} className="group cursor-pointer">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {album.thumbnails?.[0] && (
                      <Image
                        src={album.thumbnails[0].url}
                        alt={album.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="mt-2 font-medium truncate">{album.title}</p>
                  {album.year && (
                    <p className="text-sm text-muted-foreground">{album.year}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      {artist?.videos?.results && artist.videos.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {artist.videos.results.slice(0, 8).map((video, index) => (
                <div
                  key={video.videoId || index}
                  className="group cursor-pointer"
                  onClick={() => handlePlaySong(video)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    {video.thumbnails?.[0] && (
                      <Image
                        src={video.thumbnails[0].url}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <p className="mt-2 font-medium truncate">{video.title}</p>
                  {video.views && (
                    <p className="text-sm text-muted-foreground">{video.views} views</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
