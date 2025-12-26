'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Play, Pause, MoreHorizontal, Loader2, Music2 } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface ContentItem {
  videoId?: string;
  playlistId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  artists?: Array<{ name: string; id?: string }>;
  subtitle?: string;
  views?: string;
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
  const player = usePlayer();

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
      {/* Stories/Quick Access - horizontal scroll */}
      {!loading && !error && sections.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 px-2 scrollbar-hide">
          {sections.slice(0, 6).map((section, index) => (
            <div key={index} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                <div className="w-full h-full rounded-full bg-black p-0.5">
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-zinc-800">
                    {section.contents?.[0]?.thumbnails?.[0]?.url && (
                      <Image
                        src={section.contents[0].thumbnails[0].url}
                        alt={section.title}
                        fill
                        className="object-cover"
                        unoptimized
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
            const isCurrentlyPlaying = player.currentTrack?.videoId === item.videoId && player.isPlaying;

            const handlePlay = () => {
              if (item.videoId) {
                if (isCurrentlyPlaying) {
                  player.pause();
                } else {
                  player.play({
                    videoId: item.videoId,
                    title: item.title,
                    artist: artistNames,
                    thumbnail,
                  });
                }
              }
            };

            return (
              <article key={postId} className="bg-zinc-900 rounded-xl overflow-hidden">
                {/* Post Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                        {thumbnail && (
                          <Image
                            src={thumbnail}
                            alt={artistNames}
                            width={40}
                            height={40}
                            className="object-cover"
                            unoptimized
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

                {/* Post Image/Cover */}
                <div
                  className="relative aspect-square bg-zinc-800 cursor-pointer group"
                  onClick={handlePlay}
                >
                  {thumbnail && (
                    <Image
                      src={thumbnail}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className={`p-4 rounded-full bg-purple-600/90 text-white transform transition-all ${
                      isCurrentlyPlaying ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100'
                    }`}>
                      {isCurrentlyPlaying ? (
                        <Pause className="h-8 w-8" fill="white" />
                      ) : (
                        <Play className="h-8 w-8 ml-1" fill="white" />
                      )}
                    </div>
                  </div>
                  {/* Now Playing indicator */}
                  {isCurrentlyPlaying && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full">
                      <div className="flex gap-0.5">
                        <span className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" />
                        <span className="w-1 h-4 bg-purple-500 rounded-full animate-pulse delay-75" />
                        <span className="w-1 h-2 bg-purple-500 rounded-full animate-pulse delay-150" />
                      </div>
                      <span className="text-xs font-medium">Now Playing</span>
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
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
                    <button
                      onClick={handlePlay}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isCurrentlyPlaying
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {isCurrentlyPlaying ? (
                        <>
                          <Pause className="h-4 w-4" />
                          Playing
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Play
                        </>
                      )}
                    </button>
                  </div>

                  {/* Likes count */}
                  <p className="text-sm font-semibold">
                    {Math.floor(Math.random() * 10000 + 1000).toLocaleString()} likes
                  </p>

                  {/* Caption */}
                  <p className="text-sm">
                    <span className="font-semibold">{artistNames || 'Artist'}</span>{' '}
                    <span className="text-zinc-300">{item.title}</span>
                  </p>

                  {/* View comments */}
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
          <p className="text-sm mt-2">Check back later for new music.</p>
        </div>
      )}
    </div>
  );
}
