// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Grid, List, Lock, Play, LogOut } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

function StatItem({ count, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold text-lg leading-tight">{count}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState('playlists');
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;

      try {
        setLoading(true);

        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // 2. Fetch User's Playlists
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (playlistError) throw playlistError;
        setPlaylists(playlistData || []);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      <div className="px-4 pt-4 pb-4">
        {/* Top Section: Avatar + Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-gray-200 to-gray-200">
              <img
                src={
                  profile?.avatar_url ||
                  user?.user_metadata?.avatar_url ||
                  'https://via.placeholder.com/150'
                }
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-around ml-4">
            <StatItem count={playlists.length} label="Playlists" />
            <StatItem count={0} label="Followers" />
            <StatItem count={0} label="Following" />
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4">
          <h2 className="font-bold text-sm">
            {profile?.full_name || user?.user_metadata?.full_name || 'No Name'}
          </h2>
          <span className="text-xs text-gray-500 block mb-1">
            @{profile?.username || 'username'}
          </span>
          <p className="text-sm whitespace-pre-line">{profile?.website || 'Music is life 🎵'}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <button className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            Edit profile
          </button>
          <button
            onClick={signOut}
            className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-red-500"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Story Highlights (Placeholder) */}
        <div className="flex gap-4 overflow-x-auto mb-6 scrollbar-hide">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 flex items-center justify-center cursor-pointer">
              <span className="text-2xl">+</span>
            </div>
            <span className="text-xs mt-1">New</span>
          </div>
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
        {playlists.length > 0 ? (
          playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="aspect-square relative group bg-gray-100 cursor-pointer"
            >
              <img
                src={
                  playlist.cover_url ||
                  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
                }
                alt="cover"
                className="w-full h-full object-cover"
              />
            </div>
          ))
        ) : (
          <div className="col-span-3 py-10 text-center text-gray-500 text-sm">
            No playlists yet. Create one!
          </div>
        )}
      </div>
    </div>
  );
}
