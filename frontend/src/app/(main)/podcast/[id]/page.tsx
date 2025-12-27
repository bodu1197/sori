'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Play, Mic } from 'lucide-react';
import { api } from '@/lib/api';

interface EpisodeItem {
  videoId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  description?: string;
  date?: string;
  duration?: string;
}

interface PodcastData {
  title?: string;
  author?: { name: string; id?: string };
  description?: string;
  thumbnails?: Array<{ url: string }>;
  episodes?: EpisodeItem[];
}

export default function PodcastPage() {
  const params = useParams();
  const podcastId = params.id as string;
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (podcastId) {
      api.getPodcast(podcastId).then((data) => {
        if (data.success) setPodcast(data.data);
        setLoading(false);
      });
    }
  }, [podcastId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Podcast not found</p>
      </div>
    );
  }

  const thumbnail = podcast.thumbnails?.[podcast.thumbnails.length - 1]?.url || '';
  const episodes = podcast.episodes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <Link href="/podcasts" className="absolute top-0 left-0 p-2 hover:bg-zinc-800/50 rounded-full transition-colors z-10">
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-8 md:pt-0">
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
            {thumbnail ? (
              <img src={thumbnail} alt={podcast.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Mic className="h-16 w-16 text-zinc-600" />
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-zinc-400 mb-1">Podcast</p>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{podcast.title}</h1>
            {podcast.author && (
              <p className="text-zinc-400">
                {podcast.author.id ? (
                  <Link href={`/channel/${podcast.author.id}`} className="hover:text-white hover:underline">
                    {podcast.author.name}
                  </Link>
                ) : (
                  podcast.author.name
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {podcast.description && (
        <p className="text-zinc-400 max-w-3xl">{podcast.description}</p>
      )}

      {/* Episodes */}
      {episodes.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Episodes</h2>
          <div className="space-y-3">
            {episodes.map((episode, i) => (
              <Link
                key={i}
                href={episode.videoId ? `/episode/${episode.videoId}` : '#'}
                className="flex gap-4 p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors group"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                  {episode.thumbnails?.[0]?.url && (
                    <img
                      src={episode.thumbnails[0].url}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" fill="white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-2">{episode.title}</p>
                  {episode.description && (
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{episode.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    {episode.date && <span>{episode.date}</span>}
                    {episode.duration && <span>{episode.duration}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
