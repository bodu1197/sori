'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { User, LogIn, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  points: number;
  level: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      setUser(authUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-zinc-900 rounded-xl p-8">
          <User className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
          <h1 className="text-2xl font-bold mb-2">Sign in to see your profile</h1>
          <p className="text-zinc-400 mb-6">
            Create an account or sign in to access your profile, playlists, and more.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors"
          >
            <LogIn className="h-5 w-5" />
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const levelColors: Record<string, string> = {
    newbie: 'text-zinc-400',
    fan: 'text-green-400',
    enthusiast: 'text-blue-400',
    star: 'text-yellow-400',
    legend: 'text-orange-400',
    vip: 'text-purple-400',
  };

  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || '';
  const username = profile?.username || user.email?.split('@')[0] || 'user';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>

      {/* Profile Card */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="h-32 bg-gradient-to-r from-purple-600 to-pink-600" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={128}
                height={128}
                className="rounded-full border-4 border-zinc-900"
                unoptimized
              />
            ) : (
              <div className="w-32 h-32 bg-zinc-700 rounded-full border-4 border-zinc-900 flex items-center justify-center text-4xl text-zinc-400">
                {displayName[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
            {profile?.level && (
              <span className={`text-sm font-medium ${levelColors[profile.level] || 'text-zinc-400'}`}>
                {profile.level.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-zinc-500 mb-4">@{username}</p>

          {profile?.bio && (
            <p className="text-zinc-300 mb-4">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{profile.posts_count || 0}</p>
            <p className="text-zinc-500 text-sm">Posts</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{profile.followers_count || 0}</p>
            <p className="text-zinc-500 text-sm">Followers</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{profile.following_count || 0}</p>
            <p className="text-zinc-500 text-sm">Following</p>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{profile.points || 0}</p>
            <p className="text-zinc-500 text-sm">VP</p>
          </div>
        </div>
      )}
    </div>
  );
}
