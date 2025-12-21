import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

interface LikeButtonProps {
  postId: string;
  initialLikeCount?: number;
  size?: number;
  onLikeChange?: (isLiked: boolean, count: number) => void;
}

export default function LikeButton({
  postId,
  initialLikeCount = 0,
  size = 26,
  onLikeChange,
}: LikeButtonProps) {
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Check if current user has liked this post
  useEffect(() => {
    async function checkLikeStatus() {
      if (!user?.id || !postId) return;

      try {
        const { data, error } = await supabase
          .from('post_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found
          console.error('Error checking like status:', error);
        }

        setIsLiked(!!data);
      } catch {
        // Error checking like status
      }
    }

    checkLikeStatus();
  }, [user?.id, postId]);

  // Update like count when prop changes
  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  const handleLikeToggle = async () => {
    if (!user?.id || loading) return;

    setLoading(true);

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;

        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        onLikeChange?.(false, likeCount - 1);
      } else {
        // Like with animation
        setAnimating(true);

        const { error } = await supabase.from('post_likes').insert({
          user_id: user.id,
          post_id: postId,
        });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
        onLikeChange?.(true, likeCount + 1);

        // Reset animation after it completes
        setTimeout(() => setAnimating(false), 400);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLikeToggle}
      disabled={loading || !user}
      className={`relative transition-transform active:scale-90 ${loading ? 'opacity-50' : ''}`}
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      <Heart
        size={size}
        className={`transition-all duration-200 ${
          isLiked
            ? 'text-red-500 fill-red-500'
            : 'text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300'
        } ${animating ? 'scale-125' : ''}`}
        fill={isLiked ? 'currentColor' : 'none'}
      />

      {/* Pop animation overlay */}
      {animating && (
        <Heart
          size={size}
          className="absolute inset-0 text-red-500 fill-red-500 animate-ping opacity-75"
          fill="currentColor"
        />
      )}
    </button>
  );
}

// Hook to get like count display text
export function useLikeCountText(count: number): string {
  if (count === 0) return 'Be the first to like';
  if (count === 1) return '1 like';
  if (count < 1000) return `${count} likes`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K likes`;
  return `${(count / 1000000).toFixed(1)}M likes`;
}
