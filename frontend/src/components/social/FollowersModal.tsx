import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FollowButton from './FollowButton';

interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface FollowersModalProps {
  userId: string;
  type: 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
}

export default function FollowersModal({ userId, type, isOpen, onClose }: FollowersModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      if (!isOpen || !userId) return;

      setLoading(true);
      try {
        if (type === 'followers') {
          // Step 1: Get follower IDs from follows table
          const { data: followsData, error: followsError } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', userId);

          if (followsError) throw followsError;

          const followerIds = followsData?.map((f) => f.follower_id) || [];

          if (followerIds.length === 0) {
            setProfiles([]);
            return;
          }

          // Step 2: Get profiles for those IDs
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', followerIds);

          if (profilesError) throw profilesError;

          setProfiles(profilesData || []);
        } else {
          // Step 1: Get following IDs from follows table
          const { data: followsData, error: followsError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId);

          if (followsError) throw followsError;

          const followingIds = followsData?.map((f) => f.following_id) || [];

          if (followingIds.length === 0) {
            setProfiles([]);
            return;
          }

          // Step 2: Get profiles for those IDs
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', followingIds);

          if (profilesError) throw profilesError;

          setProfiles(profilesData || []);
        }
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={profile.avatar_url || 'https://via.placeholder.com/150'}
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
                  </div>
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
