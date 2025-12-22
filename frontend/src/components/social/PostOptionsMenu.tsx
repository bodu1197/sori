import { useState } from 'react';
import { MoreHorizontal, X, Trash2, Flag, Link2, UserMinus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

interface PostOptionsMenuProps {
  postId: string;
  authorId?: string;
  onDelete?: () => void;
}

export default function PostOptionsMenu({ postId, authorId, onDelete }: PostOptionsMenuProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);

  const isOwnPost = user?.id === authorId;

  const handleDelete = async () => {
    if (!user?.id || deleting) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (!error) {
        onDelete?.();
        setShowMenu(false);
        setShowConfirmDelete(false);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/post/${postId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 1500);
    } catch {
      console.error('Failed to copy link');
    }
  };

  const handleReport = async () => {
    // In a real app, this would send a report to the backend
    setReported(true);
    setTimeout(() => {
      setReported(false);
      setShowMenu(false);
    }, 1500);
  };

  const handleUnfollow = async () => {
    if (!user?.id || !authorId) return;

    try {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', authorId);
      setShowMenu(false);
    } catch (err) {
      console.error('Error unfollowing:', err);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowMenu(true)}
        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <MoreHorizontal size={20} />
      </button>

      {/* Options Menu */}
      {showMenu && !showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 w-full sm:w-[400px] sm:rounded-xl rounded-t-xl overflow-hidden">
            {/* Options */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {isOwnPost && (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Trash2 size={20} />
                  <span className="font-medium">{t('postOptions.delete')}</span>
                </button>
              )}

              {!isOwnPost && authorId && (
                <button
                  onClick={handleUnfollow}
                  className="w-full flex items-center gap-3 px-4 py-4 text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <UserMinus size={20} />
                  <span className="font-medium">{t('postOptions.unfollow')}</span>
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-4 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Link2 size={20} />
                <span className="font-medium">
                  {copied ? t('postOptions.copied') : t('postOptions.copyLink')}
                </span>
              </button>

              {!isOwnPost && (
                <button
                  onClick={handleReport}
                  className="w-full flex items-center gap-3 px-4 py-4 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Flag size={20} />
                  <span className="font-medium">
                    {reported ? t('postOptions.reported') : t('postOptions.report')}
                  </span>
                </button>
              )}
            </div>

            {/* Cancel */}
            <div className="border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowMenu(false)}
                className="w-full px-4 py-4 text-black dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                {t('postOptions.deletePost')}
              </h3>
              <p className="text-gray-500 text-sm">{t('postOptions.deleteConfirm')}</p>
            </div>
            <div className="flex border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setShowMenu(false);
                }}
                className="flex-1 py-3 text-black dark:text-white font-medium border-r border-gray-100 dark:border-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 text-red-500 font-medium flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  t('postOptions.delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
