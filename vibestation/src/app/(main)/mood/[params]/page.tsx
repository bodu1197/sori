'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Play, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

interface PlaylistItem {
  playlistId?: string;
  browseId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  subtitle?: string;
  description?: string;
}

export default function MoodPlaylistsPage() {
  const params = useParams();
  const moodParams = params.params as string;
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (moodParams) {
      api.getMoodPlaylists(decodeURIComponent(moodParams)).then((data) => {
        if (data.success) {
          setPlaylists(data.data?.playlists || data.data || []);
          setTitle(data.data?.title || 'Mood Playlists');
        }
        setLoading(false);
      });
    }
  }, [moodParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/moods" className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {playlists.map((playlist, i) => {
          const thumbnail = playlist.thumbnails?.[0]?.url || '';
          const href = playlist.playlistId
            ? `/album/${playlist.playlistId}`
            : playlist.browseId
            ? `/album/${playlist.browseId}`
            : '#';

          return (
            <Link key={i} href={href} className="group">
              <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2 relative">
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt={playlist.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-12 w-12 text-white" fill="white" />
                </div>
              </div>
              <p className="font-medium text-sm truncate">{playlist.title}</p>
              {(playlist.subtitle || playlist.description) && (
                <p className="text-xs text-zinc-400 truncate">
                  {playlist.subtitle || playlist.description}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {playlists.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p>No playlists found</p>
        </div>
      )}
    </div>
  );
}
