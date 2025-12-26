'use client';

import { useMemo } from 'react';
import { useFeed, FeedOptions } from '@/hooks/useSocial';
import { useFeedAds } from '@/hooks/useAds';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import { AdCard } from '@/components/ads/AdCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface FeedProps {
  options?: FeedOptions;
  showComposer?: boolean;
  showAds?: boolean;
  adFrequency?: number; // Show ad every N posts
}

export function Feed({
  options = {},
  showComposer = true,
  showAds = true,
  adFrequency = 5
}: FeedProps) {
  const { data: posts, isLoading, error, refetch } = useFeed(options);
  const { data: ads } = useFeedAds('feed', 5);

  // Interleave ads with posts
  const feedItems = useMemo(() => {
    if (!posts) return [];
    if (!showAds || !ads || ads.length === 0) {
      return posts.map((post) => ({ type: 'post' as const, data: post }));
    }

    const items: Array<{ type: 'post' | 'ad'; data: unknown }> = [];
    let adIndex = 0;

    posts.forEach((post, i) => {
      items.push({ type: 'post', data: post });

      // Insert ad every N posts
      if ((i + 1) % adFrequency === 0 && adIndex < ads.length) {
        items.push({ type: 'ad', data: ads[adIndex] });
        adIndex++;
      }
    });

    return items;
  }, [posts, ads, showAds, adFrequency]);

  return (
    <div className="space-y-4">
      {showComposer && <PostComposer onSuccess={() => refetch()} />}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load feed: {error.message}</p>
          </CardContent>
        </Card>
      ) : feedItems.length > 0 ? (
        <div className="space-y-4">
          {feedItems.map((item, index) =>
            item.type === 'post' ? (
              <PostCard key={`post-${(item.data as { id: string }).id}`} post={item.data as any} />
            ) : (
              <AdCard key={`ad-${(item.data as { id: string }).id}-${index}`} ad={item.data as any} />
            )
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">No posts yet</p>
            <p className="text-muted-foreground">Be the first to share something!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
