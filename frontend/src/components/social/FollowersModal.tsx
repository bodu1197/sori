import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FollowButton from './FollowButton';
import { DEFAULT_AVATAR } from '../common';

interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface FollowersModalProps {
  readonly userId: string;
  readonly type: 'followers' | 'following';
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

async function fetchUserIds(userId: string, type: 'followers' | 'following'): Promise<string[]> {
  if (type === 'followers') {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);
    if (error) throw error;
    return data?.map((f) => f.follower_id) || [];
  } else {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    if (error) throw error;
    return data?.map((f) => f.following_id) || [];
  }
}

async function fetchProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', ids);

  if (error) throw error;
  return data || [];
}

export default function FollowersModal({ userId, type, isOpen, onClose }: FollowersModalProps) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const handleProfileClick = useCallback(
    (profileId: string) => {
      onClose();
      navigate(`/profile/${profileId}`);
    },
    [onClose, navigate]
  );

  useEffect(() => {
    async function fetchProfiles() {
      if (!isOpen || !userId) return;

      setLoading(true);
      try {
        const userIds = await fetchUserIds(userId, type);
        const profilesData = await fetchProfilesByIds(userIds);
        setProfiles(profilesData);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, [isOpen, userId, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={24} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          {!loading && profiles.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </div>
          )}
          {!loading && profiles.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <button
                    onClick={() => handleProfileClick(profile.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <img
                      src={profile.avatar_url || DEFAULT_AVATAR}
                      alt={profile.username}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-sm text-black dark:text-white">
                        {profile.username}
                      </p>
                      {profile.full_name && (
                        <p className="text-sm text-gray-500">{profile.full_name}</p>
                      )}
                    </div>
                  </button>
                  <FollowButton userId={profile.id} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
