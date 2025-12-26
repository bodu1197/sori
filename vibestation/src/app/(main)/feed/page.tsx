'use client';

import { useState } from 'react';
import { TrendingUp, Users, Globe, Heart, MessageCircle, Share2 } from 'lucide-react';

type FeedType = 'all' | 'following' | 'trending';

// Placeholder posts
const mockPosts = [
  {
    id: '1',
    user: { name: 'Music Fan', avatar: null },
    content: 'Just discovered this amazing track! The vibe is unreal.',
    likes: 42,
    comments: 5,
    timestamp: '2h ago',
  },
  {
    id: '2',
    user: { name: 'K-Pop Lover', avatar: null },
    content: 'New album drop! Who else is hyped?',
    likes: 128,
    comments: 23,
    timestamp: '4h ago',
  },
  {
    id: '3',
    user: { name: 'Indie Vibes', avatar: null },
    content: 'Found this hidden gem on VibeStation. You need to check it out!',
    likes: 67,
    comments: 12,
    timestamp: '6h ago',
  },
];

export default function FeedPage() {
  const [feedType, setFeedType] = useState<FeedType>('all');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Feed</h1>
        <p className="text-zinc-400">See what the community is sharing</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-zinc-900 rounded-lg">
        <button
          onClick={() => setFeedType('all')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            feedType === 'all'
              ? 'bg-purple-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Globe className="h-4 w-4" />
          For You
        </button>
        <button
          onClick={() => setFeedType('following')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            feedType === 'following'
              ? 'bg-purple-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Users className="h-4 w-4" />
          Following
        </button>
        <button
          onClick={() => setFeedType('trending')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            feedType === 'trending'
              ? 'bg-purple-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Trending
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {mockPosts.map((post) => (
          <div
            key={post.id}
            className="bg-zinc-900 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                {post.user.name[0]}
              </div>
              <div>
                <p className="font-medium">{post.user.name}</p>
                <p className="text-sm text-zinc-500">{post.timestamp}</p>
              </div>
            </div>
            <p className="text-zinc-200">{post.content}</p>
            <div className="flex items-center gap-6 pt-2">
              <button className="flex items-center gap-2 text-zinc-400 hover:text-pink-500 transition-colors">
                <Heart className="h-5 w-5" />
                <span className="text-sm">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-zinc-400 hover:text-purple-400 transition-colors">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{post.comments}</span>
              </button>
              <button className="flex items-center gap-2 text-zinc-400 hover:text-blue-400 transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <div className="text-center py-8 text-zinc-500">
        <p>More feed features coming soon!</p>
        <p className="text-sm">Connect with your Supabase account to post and interact.</p>
      </div>
    </div>
  );
}
