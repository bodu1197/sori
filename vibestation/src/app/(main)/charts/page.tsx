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

interface ChartItem {
  videoId?: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string }>;
  views?: string;
}

interface ChartArtist {
  browseId?: string;
  title?: string;
  name?: string;
  thumbnails?: Array<{ url: string }>;
  subscribers?: string;
}

export default function ChartsPage() {
  const [country, setCountry] = useState('ZZ');
  const [songs, setSongs] = useState<ChartItem[]>([]);
  const [artists, setArtists] = useState<ChartArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCharts(country).then((data) => {
      if (data.success) {
        setSongs(data.data?.videos || data.data?.songs?.items || data.data?.trending || []);
        setArtists(data.data?.artists?.items || []);
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
          {/* Top Songs */}
          {songs.length > 0 && (
            <section className="bg-zinc-900 rounded-xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Top Songs
              </h2>
              <div className="space-y-2">
                {songs.slice(0, 20).map((song, i) => (
                  <Link
                    key={i}
                    href={song.videoId ? `/watch/${song.videoId}` : '#'}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <span className="w-6 text-center text-zinc-500 font-medium">{i + 1}</span>
                    <div className="w-12 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                      {song.thumbnails?.[0]?.url && (
                        <img src={song.thumbnails[0].url} alt={song.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-sm text-zinc-400 truncate">
                        {song.artists?.map((a) => a.name).join(', ')}
                      </p>
                    </div>
                    {song.views && <span className="text-sm text-zinc-500 hidden md:block">{song.views}</span>}
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
