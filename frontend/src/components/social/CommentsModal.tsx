import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import { DEFAULT_AVATAR } from '../common';
import { useComments } from './useComments';
import CommentCard from './CommentCard';

interface CommentsModalProps {
  readonly postId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onCommentCountChange?: (count: number) => void;
}

export default function CommentsModal({
  postId,
  isOpen,
  onClose,
  onCommentCountChange,
}: CommentsModalProps) {
  const { user } = useAuthStore();
  const { comments, loading, fetchComments, addComment, deleteComment } = useComments(postId);

  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  // Handle reply button click
  const handleReply = (parentId: string, username: string) => {
    setReplyTo({ id: parentId, username });
    setNewComment(`@${username} `);
    inputRef.current?.focus();
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyTo(null);
    setNewComment('');
  };

  // Submit comment
  const handleSubmit = async () => {
    if (!user?.id || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await addComment(newComment.trim(), replyTo?.id);
      if (result) {
        setNewComment('');
        setReplyTo(null);

        // Count update
        if (!replyTo?.id) {
          // Approximate count update or fetch?
          // Since we added locally, comments array length increased.
          onCommentCountChange?.(comments.length + 1);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteWrapper = (commentId: string) => {
    const isTopLevel = comments.some((c) => c.id === commentId);
    deleteComment(commentId);
    if (isTopLevel) {
      onCommentCountChange?.(comments.length - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-900 rounded-t-xl w-full max-w-lg h-[70vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-8" />
          <h2 className="text-lg font-semibold text-black dark:text-white">Comments</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={24} className="text-black dark:text-white" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold text-black dark:text-white">No comments yet</p>
              <p className="text-sm text-gray-500 mt-1">Start the conversation.</p>
            </div>
          )}
          {!loading && comments.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDeleteWrapper}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Replying to <span className="font-semibold">@{replyTo.username}</span>
            </span>
            <button onClick={cancelReply} className="text-sm text-blue-500">
              Cancel
            </button>
          </div>
        )}

        {/* Input */}
        {user ? (
          <div className="p-4 pb-16 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <img
              src={user.user_metadata?.avatar_url || DEFAULT_AVATAR}
              alt="You"
              className="w-8 h-8 rounded-full object-cover"
            />
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder-gray-400 outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className={`text-blue-500 font-semibold text-sm ${
                !newComment.trim() || submitting ? 'opacity-50' : 'hover:text-blue-600'
              }`}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        ) : (
          <div className="p-4 pb-16 border-t border-gray-200 dark:border-gray-700 text-center">
            <span className="text-sm text-gray-500">Log in to comment</span>
          </div>
        )}
      </div>
    </div>
  );
}
