import { useState, useEffect } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

interface BookmarkButtonProps {
  postId: string;
  size?: number;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export default function BookmarkButton({
  postId,
  size = 26,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const { user } = useAuthStore();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user has bookmarked this post
  useEffect(() => {
    async function checkBookmarkStatus() {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .maybeSingle();

        setIsBookmarked(!!data);
      } catch {
        // Error checking bookmark status
      }
    }

    checkBookmarkStatus();
  }, [user?.id, postId]);

  const handleToggleBookmark = async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (!error) {
          setIsBookmarked(false);
          onBookmarkChange?.(false);
        }
      } else {
        // Add bookmark
        const { error } = await supabase.from('bookmarks').insert({
          user_id: user.id,
          post_id: postId,
        });

        if (!error) {
          setIsBookmarked(true);
          onBookmarkChange?.(true);
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <button
      onClick={handleToggleBookmark}
      disabled={loading}
      className={`hover:opacity-60 transition ${
        isBookmarked ? 'text-black dark:text-white' : 'text-black dark:text-white'
      } disabled:opacity-50`}
    >
      {loading ? (
        <Loader2 size={size} className="animate-spin" />
      ) : (
        <Bookmark size={size} fill={isBookmarked ? 'currentColor' : 'none'} />
      )}
    </button>
  );
}
