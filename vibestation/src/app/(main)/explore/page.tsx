'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, User, Globe, Loader2 } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { code: 'ZZ', name: 'Global' },
  { code: 'US', name: 'USA' },
  { code: 'GB', name: 'UK' },
  { code: 'KR', name: 'Korea' },
  { code: 'JP', name: 'Japan' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'BR', name: 'Brazil' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
];

interface ChartItem {
  videoId?: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  views?: string;
}

interface ChartArtist {
  browseId?: string;
  title?: string;
  name?: string;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  subscribers?: string;
}

interface ChartsData {
  videos?: { items: ChartItem[] };
  artists?: { items: ChartArtist[] };
  trending?: { items: ChartItem[] };
}

export default function ExplorePage() {
  const [country, setCountry] = useState('ZZ');
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCharts() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/music/charts?country=${country}`);
        const data = await res.json();

        if (data.success) {
          setCharts(data.data);
        } else {
          setError(data.error || 'Failed to load charts');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCharts();
  }, [country]);

  const songs = charts?.videos?.items || charts?.trending?.items || [];
  const artists = charts?.artists?.items || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Explore</h1>
          <p className="text-zinc-400">Discover trending music from around the world</p>
        </div>

        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-zinc-400" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-20">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setCountry(country)}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Charts Content */}
      {!loading && !error && (
        <>
          {/* Top Songs */}
          {songs.length > 0 && (
            <section className="bg-zinc-900 rounded-xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Top Songs
              </h2>
              <div className="space-y-2">
                {songs.slice(0, 10).map((song, index) => {
                  const thumbnail = song.thumbnails?.[0]?.url || '';
                  const artistNames = song.artists?.map(a => a.name).join(', ') || 'Unknown Artist';

                  return (
                    <div
                      key={song.videoId || index}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <span className="w-6 text-center text-zinc-500 font-medium">
                        {index + 1}
                      </span>
                      <div className="w-12 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                        {thumbnail && (
                          <img
                            src={thumbnail}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-sm text-zinc-400 truncate">{artistNames}</p>
                      </div>
                      {song.views && (
                        <span className="text-sm text-zinc-500 hidden md:block">{song.views}</span>
                      )}
                    </div>
                  );
                })}
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
                {artists.slice(0, 12).map((artist, index) => {
                  const thumbnail = artist.thumbnails?.[0]?.url || '';
                  const name = artist.title || artist.name || 'Unknown';
                  const browseId = artist.browseId || '';

                  return (
                    <Link
                      key={browseId || index}
                      href={browseId ? `/artist/${browseId}` : '#'}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-transparent group-hover:ring-purple-500 transition-all flex-shrink-0">
                        {thumbnail && (
                          <img
                            src={thumbnail}
                            alt={name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                      <p className="font-medium text-center text-sm truncate w-full">{name}</p>
                      {artist.subscribers && (
                        <p className="text-xs text-zinc-500">{artist.subscribers}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* No Data */}
          {songs.length === 0 && artists.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
              <p>No chart data available for this region.</p>
              <p className="text-sm mt-2">Try selecting a different country.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
