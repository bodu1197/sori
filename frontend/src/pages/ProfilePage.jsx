// @ts-nocheck
import React, { useState } from 'react';
import { Menu, Grid, List, Lock, Play } from 'lucide-react';
import { CURRENT_USER, POSTS } from '../data/mock';

function StatItem({ count, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold text-lg leading-tight">{count}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('playlists');

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Header Name (Top Nav is Global, but maybe we want username centered here or in top nav) */}
      {/* We are using Global TopNav, so we skip the extra header row */}

      <div className="px-4 pt-4 pb-4">
        {/* Top Section: Avatar + Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-gray-200 to-gray-200">
              <img
                src={CURRENT_USER.avatar}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
              />
            </div>
            <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center border-2 border-white text-white text-xs">
              +
            </div>
          </div>

          <div className="flex flex-1 justify-around ml-4">
            <StatItem count={12} label="Playlists" />
            <StatItem count={542} label="Followers" />
            <StatItem count={189} label="Following" />
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4">
          <h2 className="font-bold text-sm">{CURRENT_USER.name}</h2>
          <span className="text-xs text-gray-500 block mb-1">Musician/Band</span>
          <p className="text-sm whitespace-pre-line">
            Music is life 🎵 Creating vibes daily. Check out my new selection! 👇
          </p>
          <a href="#" className="text-blue-900 dark:text-blue-400 text-sm font-semibold">
            musicgram.link/mylife
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <button className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            Edit profile
          </button>
          <button className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            Share profile
          </button>
        </div>

        {/* Story Highlights (Placeholder) */}
        <div className="flex gap-4 overflow-x-auto mb-6 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 flex items-center justify-center">
                <span className="text-xs">✨</span>
              </div>
              <span className="text-xs mt-1">High {i}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'playlists' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Grid size={24} />
        </button>
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'liked' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          {/* List Icon representing "Liked Songs List" */}
          <List size={24} />
        </button>
        <button
          onClick={() => setActiveTab('tagged')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'tagged' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Lock size={24} />
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-3 gap-0.5">
        {POSTS.map((post) => (
          <div key={post.id} className="aspect-square relative group bg-gray-100 cursor-pointer">
            <img src={post.playlist.cover} alt="cover" className="w-full h-full object-cover" />
            {activeTab === 'liked' && (
              <div className="absolute top-2 right-2 text-white drop-shadow-md">
                <Play fill="white" size={16} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
