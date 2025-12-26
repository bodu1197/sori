'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Globe, TrendingUp, User } from 'lucide-react';
import { api } from '@/lib/api';

const countries = [
  { code: 'ZZ', name: 'Global' },
  { code: 'US', name: 'USA' },
  { code: 'KR', name: 'Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'GB', name: 'UK' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'BR', name: 'Brazil' },
];

interface ChartPlaylist {
  playlistId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
}

interface ChartArtist {
  browseId?: string;
  title?: string;
  name?: string;
  thumbnails?: Array<{ url: string }>;
  subscribers?: string;
  rank?: string | null;
}

export default function ChartsPage() {
  const [country, setCountry] = useState('ZZ');
  const [playlists, setPlaylists] = useState<ChartPlaylist[]>([]);
  const [artists, setArtists] = useState<ChartArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCharts(country).then((data) => {
      if (data.success && data.data) {
        setPlaylists(data.data.videos || []);
        setArtists(data.data.artists || []);
      }
      setLoading(false);
    });
  }, [country]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold">Charts</h1>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-zinc-400" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <>
          {/* Top Playlists */}
          {playlists.length > 0 && (
            <section className="bg-zinc-900 rounded-xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Top Charts
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {playlists.map((playlist, i) => (
                  <Link
                    key={i}
                    href={playlist.playlistId ? `/playlist/${playlist.playlistId}` : '#'}
                    className="group"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2">
                      {playlist.thumbnails?.[0]?.url && (
                        <img src={playlist.thumbnails[0].url} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{playlist.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Top Artists */}
          {artists.length > 0 && (
            <section className="bg-zinc-900 rounded-xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <User className="h-5 w-5 text-purple-400" />
                Top Artists
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {artists.slice(0, 12).map((artist, i) => (
                  <Link
                    key={i}
                    href={artist.browseId ? `/artist/${artist.browseId}` : '#'}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-transparent group-hover:ring-purple-500 transition-all">
                      {artist.thumbnails?.[0]?.url && (
                        <img
                          src={artist.thumbnails[0].url}
                          alt={artist.title || artist.name || ''}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="font-medium text-sm text-center truncate w-full">
                      {artist.title || artist.name}
                    </p>
                    {artist.subscribers && (
                      <p className="text-xs text-zinc-500">{artist.subscribers}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
