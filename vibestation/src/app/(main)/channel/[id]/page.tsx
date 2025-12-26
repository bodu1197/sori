'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Play, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface PodcastItem {
  playlistId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
}

interface ChannelData {
  title?: string;
  description?: string;
  thumbnails?: Array<{ url: string }>;
  subscriberCount?: string;
  podcasts?: PodcastItem[];
}

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.id as string;
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (channelId) {
      api.getChannel(channelId).then((data) => {
        if (data.success) setChannel(data.data);
        setLoading(false);
      });
    }
  }, [channelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Channel not found</p>
      </div>
    );
  }

  const thumbnail = channel.thumbnails?.[channel.thumbnails.length - 1]?.url || '';
  const podcasts = channel.podcasts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <Link href="/podcasts" className="absolute top-0 left-0 p-2 hover:bg-zinc-800/50 rounded-full transition-colors z-10">
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-8 md:pt-0">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
            {thumbnail && (
              <img src={thumbnail} alt={channel.title} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-zinc-400 mb-1">Channel</p>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{channel.title}</h1>
            {channel.subscriberCount && (
              <p className="flex items-center justify-center md:justify-start gap-2 text-zinc-400">
                <Users className="h-4 w-4" />
                {channel.subscriberCount}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {channel.description && (
        <p className="text-zinc-400 max-w-3xl">{channel.description}</p>
      )}

      {/* Podcasts */}
      {podcasts.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Podcasts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {podcasts.map((podcast, i) => (
              <Link
                key={i}
                href={podcast.playlistId ? `/podcast/${podcast.playlistId}` : '#'}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2 relative">
                  {podcast.thumbnails?.[0]?.url && (
                    <img
                      src={podcast.thumbnails[0].url}
                      alt={podcast.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-10 w-10 text-white" fill="white" />
                  </div>
                </div>
                <p className="font-medium text-sm truncate">{podcast.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
