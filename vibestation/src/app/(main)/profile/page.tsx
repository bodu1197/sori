'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

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

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const updates = {
      display_name: formData.get('display_name') as string,
      bio: formData.get('bio') as string,
    };

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, ...updates });
      setEditing(false);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const levelColors: Record<string, string> = {
    newbie: 'text-zinc-400',
    fan: 'text-green-400',
    enthusiast: 'text-blue-400',
    star: 'text-yellow-400',
    legend: 'text-orange-400',
    vip: 'text-purple-400',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Profile</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="h-32 bg-gradient-to-r from-purple-600 to-pink-600" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                width={128}
                height={128}
                className="rounded-full border-4 border-zinc-900"
              />
            ) : (
              <div className="w-32 h-32 bg-zinc-700 rounded-full border-4 border-zinc-900 flex items-center justify-center text-4xl text-zinc-400">
                {(profile.display_name || profile.username)[0].toUpperCase()}
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Display Name</label>
                <input
                  type="text"
                  name="display_name"
                  defaultValue={profile.display_name || ''}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={profile.bio || ''}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white resize-none focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">
                  {profile.display_name || profile.username}
                </h2>
                <span className={`text-sm font-medium ${levelColors[profile.level] || 'text-zinc-400'}`}>
                  {profile.level.toUpperCase()}
                </span>
              </div>
              <p className="text-zinc-500 mb-4">@{profile.username}</p>

              {profile.bio && (
                <p className="text-zinc-300 mb-4">{profile.bio}</p>
              )}

              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{profile.posts_count}</p>
          <p className="text-zinc-500 text-sm">Posts</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{profile.followers_count}</p>
          <p className="text-zinc-500 text-sm">Followers</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{profile.following_count}</p>
          <p className="text-zinc-500 text-sm">Following</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{profile.points}</p>
          <p className="text-zinc-500 text-sm">VP</p>
        </div>
      </div>
    </div>
  );
}
