'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Mic, Play } from 'lucide-react';
import { api } from '@/lib/api';

interface PodcastItem {
  playlistId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  author?: { name: string; id?: string };
  description?: string;
}

interface EpisodeItem {
  videoId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  description?: string;
  date?: string;
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
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

      const data = await api.getEpisodesPlaylist(country);
      if (data.success) {
        if (Array.isArray(data.data)) {
          setEpisodes(data.data);
        } else if (data.data?.episodes) {
          setEpisodes(data.data.episodes);
        } else if (data.data?.results) {
          setEpisodes(data.data.results);
        }
      }
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Mic className="h-8 w-8 text-purple-400" />
        Podcasts
      </h1>

      {/* Latest Episodes */}
      {episodes.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Latest Episodes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {episodes.slice(0, 10).map((episode, i) => {
              const thumbnail = episode.thumbnails?.[0]?.url || '';
              const href = episode.videoId ? `/episode/${episode.videoId}` : '#';

              return (
                <Link key={i} href={href} className="flex gap-4 p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors group">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                    {thumbnail && (
                      <img
                        src={thumbnail}
                        alt={episode.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-8 w-8 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-2">{episode.title}</p>
                    {episode.description && (
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{episode.description}</p>
                    )}
                    {episode.date && (
                      <p className="text-xs text-zinc-500 mt-2">{episode.date}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {episodes.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No podcasts available</p>
          <p className="text-sm mt-2">Try searching for podcasts in the search page</p>
        </div>
      )}
    </div>
  );
}
