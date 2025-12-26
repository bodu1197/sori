'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ContentItem {
  videoId?: string;
  browseId?: string;
  playlistId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  artists?: Array<{ name: string; id?: string }>;
  subtitle?: string;
}

interface HomeSection {
  title: string;
  contents?: ContentItem[];
}

export default function HomePage() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHome(6).then((data) => {
      if (data.success) setSections(data.data || []);
      setLoading(false);
    });
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
      <h1 className="text-3xl font-bold">Welcome to VibeStation</h1>

      {sections.map((section, idx) => (
        <section key={idx}>
          <h2 className="text-xl font-bold mb-4">{section.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {section.contents?.slice(0, 12).map((item, i) => {
              const thumbnail = item.thumbnails?.[0]?.url || '';
              const artistName = item.artists?.[0]?.name || item.subtitle || '';
              const href = item.videoId
                ? `/watch/${item.videoId}`
                : item.browseId
                ? `/artist/${item.browseId}`
                : item.playlistId
                ? `/album/${item.playlistId}`
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
      ))}
    </div>
  );
}
