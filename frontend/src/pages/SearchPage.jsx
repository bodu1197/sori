// @ts-nocheck
import React from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { POSTS } from '../data/mock';

const CATEGORIES = ['For You', 'K-Pop', 'Jazz', 'Pop', 'Hip-hop', 'R&B', 'Classic'];

export default function SearchPage() {
  return (
    <div className="pb-20">
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
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 mb-2 scrollbar-hide">
        {CATEGORIES.map((cat, idx) => (
          <button
            key={idx}
            className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium whitespace-nowrap bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Explore Grid */}
      <div className="grid grid-cols-3 gap-1 px-1">
        {/* Repeating mock posts to fill the grid */}
        {Array.from({ length: 15 }).map((_, idx) => {
          const post = POSTS[idx % POSTS.length];
          // Make every 3rd item span 2 rows if we want a fancy grid (Instagram style)
          // simplistic grid for now
          const isLarge = idx % 10 === 0;

          return (
            <div
              key={idx}
              className={`relative bg-gray-200 aspect-square overflow-hidden cursor-pointer ${isLarge ? 'row-span-2 col-span-2' : ''}`}
            >
              <img src={post.playlist.cover} alt="cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/10 hover:bg-black/30 transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
