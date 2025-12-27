'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Play, ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface PlaylistItem {
  playlistId?: string;
  browseId?: string;
  videoId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  subtitle?: string;
  description?: string;
  artists?: Array<{ name: string }>;
  resultType?: string;
}

export default function MoodPlaylistsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const moodParams = params.params as string;
  const moodTitle = searchParams.get('title') || '';
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [title, setTitle] = useState(moodTitle || 'Playlists');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useSearch, setUseSearch] = useState(false);

  useEffect(() => {
    if (moodParams) {
      const decodedParams = decodeURIComponent(moodParams);

      api.getMoodPlaylists(decodedParams).then((data) => {
        if (data.success && data.data && (Array.isArray(data.data) ? data.data.length > 0 : true)) {
          setPlaylists(data.data?.playlists || data.data || []);
          setTitle(data.data?.title || moodTitle || 'Mood Playlists');
          setLoading(false);
        } else {
          // Fallback to search if mood playlists fail
          setError(data.error || 'Failed to load playlists');
          setUseSearch(true);

          // Search for the genre/mood
          const searchQuery = moodTitle || 'playlist';
          api.search(searchQuery, 'playlists').then((searchData) => {
            if (searchData.success && searchData.data) {
              setPlaylists(searchData.data.slice(0, 20));
              setTitle(`${moodTitle || 'Search'} Playlists`);
            }
            setLoading(false);
          });
        }
      });
    }
  }, [moodParams, moodTitle]);

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

      {useSearch && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>일부 플레이리스트를 불러올 수 없어 검색 결과를 표시합니다.</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {playlists.map((playlist, i) => {
          const thumbnail = playlist.thumbnails?.[0]?.url || '';
          const isArtist = playlist.resultType === 'artist';
          const href = playlist.videoId
            ? `/watch/${playlist.videoId}`
            : playlist.playlistId
            ? `/playlist/${playlist.playlistId}`
            : playlist.browseId
            ? isArtist ? `/artist/${playlist.browseId}` : `/album/${playlist.browseId}`
            : '#';

          return (
            <Link key={i} href={href} className="group">
              <div className={`aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2 relative ${isArtist ? 'rounded-full' : ''}`}>
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
              {(playlist.subtitle || playlist.description || playlist.artists) && (
                <p className="text-xs text-zinc-400 truncate">
                  {playlist.artists?.map(a => a.name).join(', ') || playlist.subtitle || playlist.description}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {playlists.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>플레이리스트를 찾을 수 없습니다</p>
          <Link href="/search" className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            검색으로 찾기
          </Link>
        </div>
      )}
    </div>
  );
}
