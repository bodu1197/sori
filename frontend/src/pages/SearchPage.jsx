// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['For You', 'K-Pop', 'Jazz', 'Pop', 'Hip-hop', 'R&B', 'Classic'];

export default function SearchPage() {
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchPosts() {
      let query = supabase.from('playlists').select('*').limit(21);

      if (searchQuery.length > 0) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data } = await query;
      if (data) setPosts(data);
    }

    // Debounce search
    const timer = setTimeout(() => {
      fetchPosts();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="pb-20 min-h-screen bg-white dark:bg-black">
      {/* Search Bar (Sticky) */}
      <div className="sticky top-0 bg-white dark:bg-black z-10 px-4 py-2">
        <div className="relative">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 mb-2 scrollbar-hide">
        {CATEGORIES.map((cat, idx) => (
          <button
            key={idx}
            className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium whitespace-nowrap bg-white dark:bg-black text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Explore Grid */}
      <div className="grid grid-cols-3 gap-1 px-1">
        {/* Repeating mock posts -> Real posts */}
        {posts.length > 0 ? (
          posts.map((post, idx) => {
            const isLarge = idx % 10 === 0;

            return (
              <div
                key={post.id || idx}
                className={`relative bg-gray-200 aspect-square overflow-hidden cursor-pointer ${isLarge ? 'row-span-2 col-span-2' : ''}`}
              >
                <img
                  src={
                    post.cover_url ||
                    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop'
                  }
                  alt="cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10 hover:bg-black/30 transition-colors" />
                <div className="absolute bottom-2 left-2 text-white font-bold opacity-0 group-hover:opacity-100">
                  {post.title}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
            No results found.
          </div>
        )}
      </div>
    </div>
  );
}
