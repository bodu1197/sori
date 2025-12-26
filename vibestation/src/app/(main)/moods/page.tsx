'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Palette } from 'lucide-react';
import { api } from '@/lib/api';

interface MoodCategory {
  title: string;
  params?: string;
  contents?: Array<{
    title: string;
    params?: string;
    thumbnails?: Array<{ url: string }>;
  }>;
}

export default function MoodsPage() {
  const [moods, setMoods] = useState<MoodCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMoods().then((data) => {
      if (data.success) setMoods(data.data || []);
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
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Palette className="h-8 w-8 text-purple-400" />
        Moods & Genres
      </h1>

      {moods.map((category, idx) => (
        <section key={idx}>
          <h2 className="text-xl font-bold mb-4">{category.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {category.contents?.map((item, i) => {
              const thumbnail = item.thumbnails?.[0]?.url || '';
              const href = item.params ? `/mood/${encodeURIComponent(item.params)}` : '#';

              return (
                <Link key={i} href={href} className="group">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-500 mb-2 relative">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Palette className="h-12 w-12 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-end p-3">
                      <p className="font-bold text-white text-sm">{item.title}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {moods.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No moods available</p>
        </div>
      )}
    </div>
  );
}
