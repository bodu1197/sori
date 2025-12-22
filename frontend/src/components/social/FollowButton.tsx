import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

interface FollowButtonProps {
  readonly userId: string;
  readonly onFollowChange?: (isFollowing: boolean) => void;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
  readonly showDropdown?: boolean;
}

export default function FollowButton({
  userId,
  onFollowChange,
  size = 'md',
  className = '',
  showDropdown = false,
}: FollowButtonProps) {
  const { user } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if current user is following this user
  useEffect(() => {
    async function checkFollowStatus() {
      if (!user?.id || user.id === userId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();

        setIsFollowing(!!data);
      } catch {
        // Error checking follow status
      } finally {
        setLoading(false);
      }
    }

    checkFollowStatus();
  }, [user?.id, userId]);

  const handleFollowToggle = async () => {
    if (!user?.id || loading) return;

    // Prevent self-follow
    if (user.id === userId) return;

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        // Follow
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: userId,
        });

        if (error) throw error;

        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show button for own profile or when not logged in
  if (!user?.id || user.id === userId) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
    lg: 'px-6 py-2 text-base',
  };

  const baseClasses = `font-semibold rounded-lg transition-all duration-200 ${sizeClasses[size]}`;

  const followingClasses = `bg-gray-100 dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700`;

  const followClasses = `bg-blue-500 text-white hover:bg-blue-600`;

  const getButtonText = () => {
    if (loading) return '...';
    if (isFollowing) return 'Following';
    return 'Follow';
  };

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`${baseClasses} ${isFollowing ? followingClasses : followClasses} ${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''} flex items-center justify-center gap-1`}
    >
      {getButtonText()}
      {showDropdown && isFollowing && <ChevronDown size={14} />}
    </button>
  );
}
