'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Play, Clock, Music2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Track {
  videoId?: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string }>;
  duration?: string;
  isExplicit?: boolean;
}

interface PlaylistData {
  id: string;
  title: string;
  description?: string;
  thumbnails?: Array<{ url: string }>;
  author?: { name: string; id?: string };
  trackCount?: number;
  duration?: string;
  tracks?: Track[];
}

export default function PlaylistPage() {
  const params = useParams();
  const playlistId = params.id as string;
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playlistId) {
      setLoading(true);
      setError(null);
      api.getPlaylist(playlistId)
        .then((data) => {
          if (data.success && data.data) {
            setPlaylist(data.data);
          } else {
            setError(data.error || 'Failed to load playlist');
          }
        })
        .catch((err) => {
          setError(err.message || 'Network error');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [playlistId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-20">
        <Music2 className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
        <p className="text-zinc-400">{error || 'Playlist not found'}</p>
        <p className="text-xs text-zinc-600 mt-2">ID: {playlistId}</p>
      </div>
    );
  }

  const thumbnail = playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url || '';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-48 h-48 md:w-64 md:h-64 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
          {thumbnail ? (
            <img src={thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="h-16 w-16 text-zinc-600" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-sm text-zinc-400 uppercase mb-2">Playlist</p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{playlist.title}</h1>
          {playlist.description && (
            <p className="text-zinc-400 mb-2">{playlist.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            {playlist.author?.name && <span>{playlist.author.name}</span>}
            {playlist.trackCount && <span>{playlist.trackCount} tracks</span>}
            {playlist.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {playlist.duration}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tracks */}
      {playlist.tracks && playlist.tracks.length > 0 && (
        <div className="bg-zinc-900/50 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 text-sm text-zinc-400 border-b border-zinc-800">
            <span className="w-8 text-center">#</span>
            <span>Title</span>
            <span className="hidden md:block">Artist</span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          {playlist.tracks.map((track, i) => (
            <Link
              key={i}
              href={track.videoId ? `/watch/${track.videoId}` : '#'}
              className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-3 hover:bg-zinc-800/50 transition-colors items-center group"
            >
              <span className="w-8 text-center text-zinc-500 group-hover:hidden">{i + 1}</span>
              <Play className="w-8 h-4 text-white hidden group-hover:block" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                  {track.thumbnails?.[0]?.url && (
                    <img src={track.thumbnails[0].url} alt={track.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{track.title}</p>
                  <p className="text-sm text-zinc-400 truncate md:hidden">
                    {track.artists?.map(a => a.name).join(', ')}
                  </p>
                </div>
              </div>
              <span className="hidden md:block text-zinc-400 truncate">
                {track.artists?.map(a => a.name).join(', ')}
              </span>
              <span className="text-zinc-500 text-sm">{track.duration || '-'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
