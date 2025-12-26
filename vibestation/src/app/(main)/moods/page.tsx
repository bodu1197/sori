'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Palette } from 'lucide-react';
import { api } from '@/lib/api';

interface MoodItem {
  title: string;
  params: string;
}

interface MoodsData {
  [category: string]: MoodItem[];
}

export default function MoodsPage() {
  const [moodsData, setMoodsData] = useState<MoodsData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMoods().then((data) => {
      if (data.success && data.data) setMoodsData(data.data);
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

      {Object.entries(moodsData).map(([categoryName, items], idx) => (
        <section key={idx}>
          <h2 className="text-xl font-bold mb-4">{categoryName}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item, i) => {
              const href = `/mood/${encodeURIComponent(item.params)}?title=${encodeURIComponent(item.title)}`;
              const gradients = [
                'from-purple-600 to-pink-500',
                'from-blue-600 to-cyan-500',
                'from-green-600 to-emerald-500',
                'from-orange-600 to-yellow-500',
                'from-red-600 to-rose-500',
                'from-indigo-600 to-violet-500',
              ];
              const gradient = gradients[i % gradients.length];

              return (
                <Link key={i} href={href} className="group">
                  <div className={`aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${gradient} mb-2 relative flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <p className="font-bold text-white text-center px-3">{item.title}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {Object.keys(moodsData).length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No moods available</p>
        </div>
      )}
    </div>
  );
}
