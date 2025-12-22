import { useState } from 'react';
import { Heart, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';
import { DEFAULT_AVATAR } from '../common';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string;
  profiles?: Profile;
  replies?: Comment[];
}

interface CommentItemProps {
  readonly comment: Comment;
  readonly onReply: (parentId: string, username: string) => void;
  readonly onDelete: (commentId: string) => void;
  readonly isReply?: boolean;
}

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

export default function CommentItem({
  comment,
  onReply,
  onDelete,
  isReply = false,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const [showReplies, setShowReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase.from('post_comments').delete().eq('id', comment.id);

      if (error) throw error;
      onDelete(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
    setShowMenu(false);
  };

  return (
    <div className={`${isReply ? 'ml-12' : ''}`}>
      <div className="flex gap-3 py-3">
        {/* Avatar */}
        <img
          src={comment.profiles?.avatar_url || DEFAULT_AVATAR}
          alt={comment.profiles?.username}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <span className="font-semibold text-sm text-black dark:text-white">
                {comment.profiles?.username || 'Unknown'}
              </span>
              <span className="text-sm text-gray-800 dark:text-gray-200 ml-2">
                {comment.content}
              </span>
            </div>

            {/* Like button */}
            <button onClick={() => setIsLiked(!isLiked)} className="flex-shrink-0 p-1">
              <Heart
                size={12}
                className={isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'}
              />
            </button>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
            <button
              onClick={() => onReply(comment.id, comment.profiles?.username || '')}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Reply
            </button>
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MoreHorizontal size={14} />
                </button>
                {showMenu && (
                  <div className="absolute left-0 top-5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* View replies button */}
          {hasReplies && !isReply && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 mt-2 text-xs text-gray-500"
            >
              <div className="w-6 h-px bg-gray-300 dark:bg-gray-600" />
              {showReplies ? (
                <>
                  <ChevronUp size={12} />
                  Hide replies
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  View {comment.replies?.length}{' '}
                  {comment.replies?.length === 1 ? 'reply' : 'replies'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies && hasReplies && (
        <div className="border-l-2 border-gray-100 dark:border-gray-800">
          {comment.replies?.map((reply) => (
            <CommentItem
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
