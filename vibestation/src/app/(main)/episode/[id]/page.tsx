'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mic } from 'lucide-react';
import { api } from '@/lib/api';

interface EpisodeData {
  videoId?: string;
  title?: string;
  author?: { name: string; id?: string };
  description?: string;
  thumbnails?: Array<{ url: string }>;
  date?: string;
  duration?: string;
  podcast?: { title: string; id?: string };
}

export default function EpisodePage() {
  const params = useParams();
  const episodeId = params.id as string;
  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (episodeId) {
      api.getEpisode(episodeId).then((data) => {
        if (data.success) setEpisode(data.data);
        setLoading(false);
      });
    }
  }, [episodeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Episode not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/podcasts" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="h-5 w-5" />
        Back to Podcasts
      </Link>

      {/* YouTube Player */}
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${episodeId}?autoplay=0&rel=0`}
          title={episode.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {/* Episode Info */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{episode.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
          {episode.podcast && (
            <Link
              href={episode.podcast.id ? `/podcast/${episode.podcast.id}` : '#'}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Mic className="h-4 w-4" />
              {episode.podcast.title}
            </Link>
          )}
          {episode.author && (
            <span>
              by{' '}
              {episode.author.id ? (
                <Link href={`/channel/${episode.author.id}`} className="hover:text-white hover:underline">
                  {episode.author.name}
                </Link>
              ) : (
                episode.author.name
              )}
            </span>
          )}
          {episode.date && <span>{episode.date}</span>}
          {episode.duration && <span>{episode.duration}</span>}
        </div>

        {episode.description && (
          <div className="bg-zinc-900 rounded-xl p-6">
            <h3 className="font-bold mb-3">Description</h3>
            <p className="text-zinc-300 whitespace-pre-wrap">{episode.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
