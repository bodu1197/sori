'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Play } from 'lucide-react';
import { api } from '@/lib/api';

interface ExploreItem {
  title: string;
  type?: string;
  browseId?: string;
  audioPlaylistId?: string;
  thumbnails?: Array<{ url: string }>;
  artists?: Array<{ name: string }>;
}

interface ExploreData {
  new_releases?: ExploreItem[];
  top_results?: ExploreItem[];
  moods_and_genres?: Array<{ title: string; params: string }>;
}

export default function ExplorePage() {
  const [data, setData] = useState<ExploreData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      let country = 'US';
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        country = geoData.country_code || 'US';
      } catch {
        // Fallback to US
      }

      const res = await api.getExplore(country);
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const sections = [
    { title: 'New Releases', items: data.new_releases || [] },
    { title: 'Top Results', items: data.top_results || [] },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Explore</h1>

      {sections.map((section, idx) => (
        section.items.length > 0 && (
          <section key={idx}>
            <h2 className="text-xl font-bold mb-4">{section.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {section.items.slice(0, 12).map((item, i) => {
                const thumbnail = item.thumbnails?.[0]?.url || '';
                const artistName = item.artists?.map(a => a.name).join(', ') || item.type || '';
                const href = item.browseId
                  ? `/album/${item.browseId}`
                  : item.audioPlaylistId
                  ? `/playlist/${item.audioPlaylistId}`
                  : '#';

                return (
                  <Link key={i} href={href} className="group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2 relative">
                      {thumbnail && (
                        <img
                          src={thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-12 w-12 text-white" fill="white" />
                      </div>
                    </div>
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{artistName}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )
      ))}

      {data.moods_and_genres && data.moods_and_genres.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Moods & Genres</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.moods_and_genres.slice(0, 12).map((item, i) => (
              <Link key={i} href={`/mood/${encodeURIComponent(item.params)}`} className="group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 mb-2 flex items-center justify-center">
                  <p className="text-white font-bold text-center px-2">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
