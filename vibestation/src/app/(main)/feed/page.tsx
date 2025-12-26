'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { TrendingUp, Music2, Play, Loader2 } from 'lucide-react';

interface ContentItem {
  videoId?: string;
  playlistId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  artists?: Array<{ name: string }>;
  subtitle?: string;
}

interface HomeSection {
  title: string;
  contents?: ContentItem[];
}

export default function FeedPage() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHome() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/music/home');
        const data = await res.json();

        if (data.success && data.data) {
          setSections(data.data);
        } else {
          setError(data.error || 'Failed to load content');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchHome();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 px-4">
      <div>
        <h1 className="text-3xl font-bold">Feed</h1>
        <p className="text-zinc-400">Discover music curated for you</p>
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
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content Sections */}
      {!loading && !error && sections.length > 0 && (
        <div className="space-y-8">
          {sections.map((section, sectionIndex) => (
            <section key={sectionIndex} className="bg-zinc-900 rounded-xl p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                {sectionIndex === 0 ? (
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                ) : (
                  <Music2 className="h-5 w-5 text-purple-400" />
                )}
                {section.title}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {section.contents?.slice(0, 8).map((item, itemIndex) => {
                  const thumbnail = item.thumbnails?.[0]?.url || '';
                  const artistNames = item.artists?.map(a => a.name).join(', ') || item.subtitle || '';

                  return (
                    <div
                      key={item.videoId || item.playlistId || itemIndex}
                      className="group cursor-pointer"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2">
                        {thumbnail && (
                          <Image
                            src={thumbnail}
                            alt={item.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <button className="p-3 rounded-full bg-purple-600 text-white opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                            <Play className="h-5 w-5" fill="white" />
                          </button>
                        </div>
                      </div>
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      {artistNames && (
                        <p className="text-xs text-zinc-500 truncate">{artistNames}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* No Content */}
      {!loading && !error && sections.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Music2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No content available.</p>
          <p className="text-sm mt-2">Check back later for new music.</p>
        </div>
      )}
    </div>
  );
}
