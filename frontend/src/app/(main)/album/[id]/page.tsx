'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Play, ArrowLeft, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface TrackItem {
  videoId?: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  duration?: string;
  isExplicit?: boolean;
}

interface AlbumData {
  title?: string;
  type?: string;
  thumbnails?: Array<{ url: string }>;
  artists?: Array<{ name: string; id?: string }>;
  year?: string;
  trackCount?: number;
  duration?: string;
  tracks?: TrackItem[];
  description?: string;
}

export default function AlbumPage() {
  const params = useParams();
  const albumId = params.id as string;
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (albumId) {
      // Try album first, then playlist
      api.getAlbum(albumId).then((data) => {
        if (data.success && data.data) {
          setAlbum(data.data);
          setLoading(false);
        } else {
          // Try as playlist
          api.getPlaylist(albumId).then((playlistData) => {
            if (playlistData.success) {
              setAlbum(playlistData.data);
            }
            setLoading(false);
          });
        }
      });
    }
  }, [albumId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Album not found</p>
      </div>
    );
  }

  const thumbnail = album.thumbnails?.[album.thumbnails.length - 1]?.url || album.thumbnails?.[0]?.url || '';
  const tracks = album.tracks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <Link href="/" className="absolute top-0 left-0 p-2 hover:bg-zinc-800/50 rounded-full transition-colors z-10">
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-8 md:pt-0">
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 shadow-2xl">
            {thumbnail && (
              <img src={thumbnail} alt={album.title} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-zinc-400 mb-1 uppercase">{album.type || 'Album'}</p>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{album.title}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-zinc-400">
              {album.artists?.map((artist, i) => (
                <span key={i}>
                  {artist.id ? (
                    <Link href={`/artist/${artist.id}`} className="hover:text-white hover:underline">
                      {artist.name}
                    </Link>
                  ) : (
                    artist.name
                  )}
                  {i < (album.artists?.length || 0) - 1 && ', '}
                </span>
              ))}
              {album.year && <span>• {album.year}</span>}
              {album.trackCount && <span>• {album.trackCount} songs</span>}
              {album.duration && <span>• {album.duration}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {album.description && (
        <p className="text-zinc-400 text-sm max-w-3xl">{album.description}</p>
      )}

      {/* Tracks */}
      {tracks.length > 0 && (
        <section className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 border-b border-zinc-800 text-sm text-zinc-400">
            <span className="w-8 text-center">#</span>
            <span>Title</span>
            <span className="hidden md:block"><Clock className="h-4 w-4" /></span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {tracks.map((track, i) => (
              <Link
                key={i}
                href={track.videoId ? `/watch/${track.videoId}` : '#'}
                className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors group items-center"
              >
                <span className="w-8 text-center text-zinc-500 group-hover:hidden">{i + 1}</span>
                <Play className="w-8 h-4 text-white hidden group-hover:block" />
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-2">
                    {track.title}
                    {track.isExplicit && (
                      <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded">E</span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-400 truncate">
                    {track.artists?.map((a) => a.name).join(', ')}
                  </p>
                </div>
                <span className="text-sm text-zinc-500 hidden md:block">{track.duration}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
