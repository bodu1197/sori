import { useState, useEffect } from 'react';
import { Repeat2, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

interface RepostButtonProps {
  postId: string;
  initialReposted?: boolean;
  initialCount?: number;
  onRepost?: (reposted: boolean) => void;
  size?: 'sm' | 'md';
}

export default function RepostButton({
  postId,
  initialReposted = false,
  initialCount = 0,
  onRepost,
  size = 'md',
}: RepostButtonProps) {
  const { user } = useAuthStore();
  const [isReposted, setIsReposted] = useState(initialReposted);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [quote, setQuote] = useState('');

  // Check if user has already reposted this post
  useEffect(() => {
    async function checkRepostStatus() {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('reposts')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .maybeSingle();

        setIsReposted(!!data);
      } catch {
        // Error checking repost status
      }
    }

    checkRepostStatus();
  }, [user?.id, postId]);

  const handleToggleRepost = async () => {
    if (!user?.id || loading) return;

    if (isReposted) {
      // Undo repost
      setLoading(true);
      try {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (!error) {
          setIsReposted(false);
          setCount((prev) => Math.max(0, prev - 1));
          onRepost?.(false);
        }
      } catch (err) {
        console.error('Error removing repost:', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Show modal for new repost
      setShowModal(true);
    }
  };

  const handleConfirmRepost = async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('reposts').insert({
        user_id: user.id,
        post_id: postId,
        quote: quote.trim() || null,
      });

      if (!error) {
        setIsReposted(true);
        setCount((prev) => prev + 1);
        onRepost?.(true);
        setShowModal(false);
        setQuote('');
      }
    } catch (err) {
      console.error('Error creating repost:', err);
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'sm' ? 18 : 22;

  return (
    <>
      <button
        onClick={handleToggleRepost}
        disabled={loading || !user}
        className={`flex items-center gap-1.5 transition ${
          isReposted ? 'text-green-500' : 'text-gray-600 dark:text-gray-400 hover:text-green-500'
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : (
          <Repeat2 size={iconSize} className={isReposted ? 'stroke-2' : ''} />
        )}
        {count > 0 && <span className="text-sm">{count}</span>}
      </button>

      {/* Repost Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-black dark:text-white">Repost</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setQuote('');
                }}
                className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <textarea
                placeholder="Add a comment (optional)..."
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                maxLength={280}
                rows={3}
                className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <p className="text-right text-xs text-gray-500 mt-1">{quote.length}/280</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-4 pb-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setQuote('');
                }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-black dark:text-white rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRepost}
                disabled={loading}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Repeat2 size={18} />
                    Repost
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
