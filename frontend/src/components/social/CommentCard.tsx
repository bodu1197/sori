import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';
import { DEFAULT_AVATAR } from '../common';
import { Comment } from './useComments';

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

interface CommentCardProps {
  comment: Comment;
  onReply: (parentId: string, username: string) => void;
  onDelete: (commentId: string) => void;
  isReply?: boolean;
}

export default function CommentCard({
  comment,
  onReply,
  onDelete,
  isReply = false,
}: CommentCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const shareText = comment.content.slice(0, 200);
  const shareUrl = `${window.location.origin}/post/${comment.post_id}`;

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleShareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setShowShareMenu(false);
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setShowShareMenu(false);
  };

  const handleShareKakao = () => {
    window.open(
      `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowShareMenu(false);
  };

  const handleDelete = async () => {
    if (!confirm(t('comments.deleteConfirm', 'Delete this comment?'))) return;
    try {
      // Optimistic update handled by parent via onDelete, but here we do actual delete?
      // Step 637 code did: await supabase...delete().eq('id', comment.id); onDelete(..);
      // Wait, `useComments` hook provides `deleteComment` which does Supabase call.
      // So `onDelete` prop from parent (which calls `deleteComment`) should handle it.
      // BUT `InlineComments` handles `onDelete` by updating local state only?
      // Step 637 `handleDelete` method (L596) calls `setComments` setter.
      // And L136 `await supabase...` was inside `CommentCard`.
      // I should MOVE Supabase call to `useComments` hook (done in Step 640).
      // So `CommentCard` should just call `onDelete(comment.id)`.

      // Let's assume `onDelete` passed here is the one from `useComments` directly or wrapper.
      // `useComments` `deleteComment` is async.
      onDelete(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
    setShowMenu(false);
  };

  return (
    <div
      className={`${isReply ? 'ml-10 border-l-2 border-gray-100 dark:border-gray-800 pl-3' : ''}`}
    >
      <div className="py-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(`/profile/${comment.user_id}`)}>
            <img
              src={comment.profiles?.avatar_url || DEFAULT_AVATAR}
              alt={comment.profiles?.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/profile/${comment.user_id}`)}
                className="font-semibold text-sm text-black dark:text-white hover:underline"
              >
                {comment.profiles?.username || 'Unknown'}
              </button>
              <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
            </div>
            {/* Content */}
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-wrap">
              {comment.content}
            </p>
            {/* Image if attached */}
            {comment.image_url && (
              <img
                src={comment.image_url}
                alt="Comment attachment"
                className="mt-2 rounded-lg max-h-60 object-cover"
              />
            )}
            {/* Video if attached */}
            {comment.video_url && (
              <video controls className="mt-2 rounded-lg max-h-60 w-full">
                <source src={comment.video_url} />
                <track kind="captions" />
              </video>
            )}
          </div>
          {/* Menu */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[100px]">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Bar - Like post icons */}
        <div className="flex items-center gap-4 mt-2 ml-11">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition"
          >
            <Heart size={16} className={isLiked ? 'text-red-500 fill-red-500' : ''} />
            {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
          </button>
          <button
            onClick={() => onReply(comment.id, comment.profiles?.username || '')}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition"
          >
            <MessageCircle size={16} />
            {hasReplies && <span className="text-xs">{comment.replies?.length}</span>}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="text-gray-500 hover:text-green-500 transition"
            >
              <Share2 size={16} />
            </button>
            {showShareMenu && (
              <div className="absolute left-0 bottom-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20 min-w-[160px]">
                <button
                  onClick={handleShareTwitter}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-5 h-5 bg-black dark:bg-white rounded flex items-center justify-center text-white dark:text-black text-xs font-bold">
                    X
                  </span>
                  <span>Twitter</span>
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    f
                  </span>
                  <span>Facebook</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">
                    W
                  </span>
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={handleShareKakao}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className="w-5 h-5 bg-yellow-400 rounded flex items-center justify-center text-black text-xs font-bold">
                    K
                  </span>
                  <span>KakaoTalk</span>
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={handleCopyLink}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  {copied ? t('common.copied', 'Copied!') : t('common.copyLink', 'Copy Link')}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className="text-gray-500 hover:text-yellow-500 transition"
          >
            <Bookmark size={16} className={isBookmarked ? 'text-yellow-500 fill-yellow-500' : ''} />
          </button>
        </div>

        {/* View/Hide replies */}
        {hasReplies && !isReply && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 mt-2 ml-11 text-xs text-gray-500 hover:text-gray-700"
          >
            {showReplies ? (
              <>
                <ChevronUp size={14} />
                {t('comments.hideReplies', 'Hide replies')}
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                {t('comments.viewReplies', 'View')} {comment.replies?.length}{' '}
                {comment.replies?.length === 1
                  ? t('comments.reply', 'reply')
                  : t('comments.replies', 'replies')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Replies */}
      {showReplies && hasReplies && (
        <div>
          {comment.replies?.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
