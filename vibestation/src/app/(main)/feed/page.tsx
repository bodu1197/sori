'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, MoreHorizontal, Loader2, Music2 } from 'lucide-react';

interface ContentItem {
  videoId?: string;
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

export default function FeedPage() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

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

  const toggleLike = (id: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const allPosts = sections.flatMap(section =>
    (section.contents || []).map(item => ({
      ...item,
      sectionTitle: section.title
    }))
  ).slice(0, 20);

  return (
    <div className="max-w-lg mx-auto space-y-4 py-2">
      {/* Stories/Quick Access */}
      {!loading && !error && sections.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 px-2">
          {sections.slice(0, 6).map((section, index) => (
            <div key={index} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                <div className="w-full h-full rounded-full bg-black p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                    {section.contents?.[0]?.thumbnails?.[0]?.url && (
                      <img
                        src={section.contents[0].thumbnails[0].url}
                        alt={section.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs text-zinc-400 truncate w-16 text-center">
                {section.title.slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      )}

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

      {/* SNS Style Feed */}
      {!loading && !error && allPosts.length > 0 && (
        <div className="space-y-6">
          {allPosts.map((item, index) => {
            const postId = item.videoId || item.playlistId || `post-${index}`;
            const thumbnail = item.thumbnails?.[0]?.url || '';
            const artistNames = item.artists?.map(a => a.name).join(', ') || item.subtitle || '';
            const artistId = item.artists?.[0]?.id;
            const isLiked = likedPosts.has(postId);

            return (
              <article key={postId} className="bg-zinc-900 rounded-xl overflow-hidden">
                {/* Post Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                        {thumbnail && (
                          <img
                            src={thumbnail}
                            alt={artistNames}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      {artistId ? (
                        <Link href={`/artist/${artistId}`} className="font-semibold text-sm hover:underline">
                          {artistNames || 'Artist'}
                        </Link>
                      ) : (
                        <span className="font-semibold text-sm">{artistNames || 'Artist'}</span>
                      )}
                      <p className="text-xs text-zinc-500">{item.sectionTitle}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-zinc-800 rounded-full">
                    <MoreHorizontal className="h-5 w-5 text-zinc-400" />
                  </button>
                </div>

                {/* Post Image */}
                <div className="aspect-square bg-zinc-800">
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Post Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(postId)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`h-6 w-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
                      />
                    </button>
                    <button className="hover:scale-110 transition-transform">
                      <MessageCircle className="h-6 w-6" />
                    </button>
                    <button className="hover:scale-110 transition-transform">
                      <Share2 className="h-6 w-6" />
                    </button>
                  </div>

                  <p className="text-sm font-semibold">
                    {Math.floor(Math.random() * 10000 + 1000).toLocaleString()} likes
                  </p>

                  <p className="text-sm">
                    <span className="font-semibold">{artistNames || 'Artist'}</span>{' '}
                    <span className="text-zinc-300">{item.title}</span>
                  </p>

                  <button className="text-sm text-zinc-500 hover:text-zinc-300">
                    View all {Math.floor(Math.random() * 500 + 50)} comments
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* No Content */}
      {!loading && !error && allPosts.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <Music2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No content available.</p>
        </div>
      )}
    </div>
  );
}
