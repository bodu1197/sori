'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Globe, TrendingUp, User, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

const countries = [
  { code: 'ZZ', name: 'Global' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'Korea' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'PA', name: 'Panama' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'RS', name: 'Serbia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'ZW', name: 'Zimbabwe' },
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
  const [country, setCountry] = useState('');
  const [playlists, setPlaylists] = useState<ChartPlaylist[]>([]);
  const [artists, setArtists] = useState<ChartArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Detect user's country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const countryCode = data.country_code;

        // Check if the detected country is supported
        const isSupported = countries.some(c => c.code === countryCode);
        if (isSupported) {
          setDetectedCountry(countryCode);
          setCountry(countryCode);
        } else {
          setCountry('ZZ'); // Fallback to Global
        }
      } catch {
        setCountry('ZZ'); // Fallback to Global on error
      }
    };

    detectCountry();
  }, []);

  // Fetch charts when country changes
  useEffect(() => {
    if (!country) return;

    setLoading(true);
    api.getCharts(country).then((data) => {
      if (data.success && data.data) {
        setPlaylists(data.data.videos || []);
        setArtists(data.data.artists || []);
      }
      setLoading(false);
    });
  }, [country]);

  const currentCountryName = countries.find(c => c.code === country)?.name || 'Global';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Charts</h1>
          {detectedCountry && country === detectedCountry && (
            <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              자동 감지: {currentCountryName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-zinc-400" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm min-w-[180px]"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} {c.code === detectedCountry ? '📍' : ''}
              </option>
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
