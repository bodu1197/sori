// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';

function StoryRail() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    async function fetchStories() {
      // Fetch some users to simulate stories
      const { data } = await supabase.from('profiles').select('*').limit(10);
      if (data) setProfiles(data);
    }
    fetchStories();
  }, []);

  if (profiles.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-3 border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
      {profiles.map((profile) => (
        <div key={profile.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
          <div
            className={`rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500`}
          >
            <div className="bg-white dark:bg-black p-[2px] rounded-full">
              <img
                src={profile.avatar_url || 'https://via.placeholder.com/150'}
                alt={profile.username}
                className="w-[60px] h-[60px] rounded-full object-cover"
              />
            </div>
          </div>
          <span className="text-xs mt-1 text-gray-800 dark:text-gray-200 truncate w-[64px] text-center">
            {profile.username}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlaylistPost({ post }) {
  const user = post.profiles; // Joined data
  return (
    <article className="pb-4 border-b border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-3">
        <div className="flex items-center gap-2 cursor-pointer">
          <img
            src={user?.avatar_url || 'https://via.placeholder.com/150'}
            alt={user?.username}
            className="w-8 h-8 rounded-full object-cover border border-gray-100"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none hover:underline">
              {user?.username || 'Unknown'}
            </span>
            {user?.location && (
              <span className="text-xs text-gray-500 leading-none mt-0.5">{user.location}</span>
            )}
          </div>
        </div>
        <button className="text-gray-500">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Playlist Visual (Square) */}
      <div className="relative w-full aspect-square bg-gray-100 cursor-pointer group overflow-hidden">
        <img
          src={
            post.cover_url ||
            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop'
          }
          alt={post.title}
          className="w-full h-full object-cover"
        />

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1"></div>
          </div>
        </div>

        {/* Playlist Tag */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
          <span className="text-xs font-medium text-white">🎵 {post.title}</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center px-3 pt-3 pb-2">
        <div className="flex gap-4">
          <button className="hover:opacity-60">
            <Heart size={26} />
          </button>
          <button className="hover:opacity-60">
            <MessageCircle size={26} />
          </button>
          <button className="hover:opacity-60">
            <Send size={26} />
          </button>
        </div>
        <button className="hover:opacity-60">
          <Bookmark size={26} />
        </button>
      </div>

      {/* Likes */}
      <div className="px-3">
        <span className="font-semibold text-sm">0 likes</span>
      </div>

      {/* Caption */}
      <div className="px-3 pt-1">
        <div className="text-sm">
          <span className="font-semibold mr-2">{user?.username}</span>
          <span className="text-gray-900 dark:text-gray-100">{post.description}</span>
        </div>
        <button className="text-gray-500 text-sm mt-1">View comments</button>
      </div>

      {/* Timestamp */}
      <div className="px-3 mt-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        // Fetch playlists and join with profiles
        const { data, error } = await supabase
          .from('playlists')
          .select(
            `
                    *,
                    profiles:user_id (
                        username,
                        avatar_url,
                        full_name
                    )
                `
          )
          .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setPosts(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) return <div className="p-10 text-center">Loading feed...</div>;

  return (
    <div className="pb-20">
      <StoryRail />
      <div className="space-y-2 mt-2">
        {posts.length > 0 ? (
          posts.map((post) => <PlaylistPost key={post.id} post={post} />)
        ) : (
          <div className="py-20 text-center text-gray-500">
            <p>No posts yet.</p>
            <p className="text-sm">Follow some musicians or create a playlist!</p>
          </div>
        )}
      </div>
    </div>
  );
}
