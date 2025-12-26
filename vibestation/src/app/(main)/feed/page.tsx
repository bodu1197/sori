'use client';

import { useState } from 'react';
import { Feed } from '@/components/social/Feed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, Globe } from 'lucide-react';

export default function FeedPage() {
  const [feedType, setFeedType] = useState<'all' | 'following' | 'trending'>('all');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feed</h1>
        <p className="text-muted-foreground">See what the community is sharing</p>
      </div>

      <Tabs value={feedType} onValueChange={(v) => setFeedType(v as typeof feedType)}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 gap-2">
            <Globe className="h-4 w-4" />
            For You
          </TabsTrigger>
          <TabsTrigger value="following" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            Following
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex-1 gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Feed options={{ type: feedType }} showComposer={true} />
    </div>
  );
}
