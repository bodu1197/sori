import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  UserPlus,
  Check,
  MoreHorizontal,
  Grid,
  Music,
  Play,
  Heart,
  Share2,
  BadgeCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AIChatDrawer } from '../components/ai/AIChatDrawer';
import { DEFAULT_AVATAR } from '../components/common';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

export default function ArtistProfilePage() {
  const { id } = useParams<{ id: string }>(); // browseId
  const navigate = useNavigate();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'music'>('music');

  useEffect(() => {
    async function fetchArtist() {
      if (!id) return;
      setLoading(true);

      try {
        // 1. Check DB first
        let { data, error } = await supabase
          .from('music_artists')
          .select('*')
          .eq('browse_id', id)
          .single();

        // 2. If not in DB, provision it via API
        if (!data) {
          const res = await fetch(`${API_BASE_URL}/api/provision/artist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ browseId: id }), // Provision by ID if possible, or search logic needed
            // Note: Provision API currently expects 'artistName'.
            // If we only have ID, we might need to fetch summary first.
            // Assuming this page is entered via click, we might have passed state or Name.
            // For now, let's assume DB has it or we rely on basic fetch.
          });
          // If provision fails (e.g. need name), we might show loading or minimal info
        }

        // Refetch/Set Data
        if (data) {
          setArtist(data);
        } else {
          // Fallback for demo if DB fetch fails (or provision pending)
          // Real app should handle this robustly
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchArtist();
  }, [id]);

  // Parse thumbnails
  const getAvatar = () => {
    try {
      const thumbs = JSON.parse(artist?.thumbnails || '[]');
      return thumbs.length ? thumbs[thumbs.length - 1].url : DEFAULT_AVATAR;
    } catch {
      return DEFAULT_AVATAR;
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  if (!artist)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Artist not found
      </div>
    );

  const avatarUrl = getAvatar();

  return (
    <div className="min-h-screen bg-black text-white pb-20 relative">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <div className="font-bold text-sm md:text-base flex items-center gap-1">
          {artist.name} <BadgeCheck size={14} className="text-blue-500" fill="white" />
        </div>
        <button className="p-2 -mr-2 hover:bg-white/10 rounded-full">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Header Profile Info */}
      <div className="px-4 pt-2 pb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
              <div className="w-full h-full rounded-full bg-black p-[2px]">
                <img
                  src={avatarUrl}
                  className="w-full h-full rounded-full object-cover"
                  alt="profile"
                />
              </div>
            </div>
            {/* Status Indicator */}
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full border border-black animate-pulse"></div>
            </div>
          </div>

          <div className="flex-1 flex justify-around text-center">
            <div>
              <div className="font-bold text-lg">2.4M</div>
              <div className="text-xs text-gray-400">Followers</div>
            </div>
            <div>
              <div className="font-bold text-lg">142</div>
              <div className="text-xs text-gray-400">Posts</div>
            </div>
            <div>
              <div className="font-bold text-lg">12</div>
              <div className="text-xs text-gray-400">Following</div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4">
          <h1 className="font-bold text-lg flex items-center gap-1">
            {artist.name}
            <BadgeCheck size={18} className="text-blue-500" fill="white" />
          </h1>
          <p className="text-sm text-gray-300 mt-1 line-clamp-2">
            {artist.description ||
              `Official MusicGram profile for ${artist.name}. Listen to latest hits and chatting with AI Persona.`}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>🎵 Musician/Band</span>
            <span>•</span>
            <a href="#" className="text-blue-400">
              linktr.ee/{artist.name.replace(/\s/g, '').toLowerCase()}
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
              isFollowing
                ? 'bg-gray-800 text-white border border-gray-700'
                : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex-1 py-2 rounded-lg font-semibold text-sm bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition flex items-center justify-center gap-2"
          >
            Message
          </button>
          <button className="p-2 rounded-lg bg-gray-800 text-white border border-gray-700">
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-gray-800 mt-2">
        <div className="flex">
          <button
            onClick={() => setActiveTab('music')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium border-b-2 ${
              activeTab === 'music' ? 'border-white text-white' : 'border-transparent text-gray-500'
            }`}
          >
            <Music size={20} />
            <span>Music</span>
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium border-b-2 ${
              activeTab === 'posts' ? 'border-white text-white' : 'border-transparent text-gray-500'
            }`}
          >
            <Grid size={20} />
            <span>Posts</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {activeTab === 'music' ? (
          // Music List (Top Songs)
          <div className="p-4 space-y-4">
            {(artist.topSongs || [1, 2, 3, 4, 5]).map((song: any, i: number) => {
              const songTitle = typeof song === 'object' ? song.title : `Top Hit Song ${i + 1}`;
              const songPlays = typeof song === 'object' ? 'High' : '12M';
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition"
                >
                  <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center text-gray-600 overflow-hidden relative">
                    {typeof song === 'object' && song.thumbnails ? (
                      <img
                        src={song.thumbnails[0]?.url || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music size={20} />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play size={20} fill="white" className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm md:text-base line-clamp-1">{songTitle}</div>
                    <div className="text-xs text-gray-500">Popularity • {songPlays}</div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-white">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          // Feed Posts (Realistic)
          <div className="p-4 space-y-6">
            {/* Fake Post 1: New Album */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                  <img src={avatarUrl} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1">
                    {artist.name} <BadgeCheck size={14} className="text-blue-500" fill="white" />
                  </div>
                  <div className="text-xs text-gray-500">2 hours ago</div>
                </div>
              </div>
              <p className="text-sm mb-3 text-gray-200">
                My new album is finally out! 🎹 I put my heart and soul into this project. Hope you
                guys love it as much as I do! 💜 #NewMusic #AlbumRelease
              </p>
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer">
                <img
                  src={artist.thumbnails ? JSON.parse(artist.thumbnails)[0].url : ''}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="flex gap-6 mt-4 text-gray-400 px-1">
                <button className="flex items-center gap-1.5 hover:text-red-500 transition">
                  <Heart size={20} /> <span className="text-xs">12.5k</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-400 transition">
                  <MessageCircle size={20} /> <span className="text-xs">482</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-green-400 transition ml-auto">
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {/* Fake Post 2: Life Update */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                  <img src={avatarUrl} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1">
                    {artist.name} <BadgeCheck size={14} className="text-blue-500" fill="white" />
                  </div>
                  <div className="text-xs text-gray-500">Yesterday</div>
                </div>
              </div>
              <p className="text-sm mb-3 text-gray-200">
                Thank you for the amazing concert last night! The energy was insane 🔥🔥🔥 Can't
                wait to see you all again soon. Love you!
              </p>
              <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                <img
                  src={`https://source.unsplash.com/random/400x400?concert&sig=${Math.random()}`}
                  className="w-full aspect-square object-cover"
                />
                <img
                  src={`https://source.unsplash.com/random/400x400?crowd&sig=${Math.random()}`}
                  className="w-full aspect-square object-cover"
                />
              </div>
              <div className="flex gap-6 mt-4 text-gray-400 px-1">
                <button className="flex items-center gap-1.5 hover:text-red-500 transition">
                  <Heart size={20} /> <span className="text-xs">28.4k</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-400 transition">
                  <MessageCircle size={20} /> <span className="text-xs">1.2k</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Drawer */}
      {isChatOpen && <AIChatDrawer artistName={artist.name} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}
