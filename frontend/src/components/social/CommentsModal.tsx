import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';
import CommentItem from './CommentItem';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  profiles?: Profile;
  replies?: Comment[];
}

interface CommentsModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentsModal({
  postId,
  isOpen,
  onClose,
  onCommentCountChange,
}: CommentsModalProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      if (!isOpen || !postId) return;

      setLoading(true);
      try {
        // Fetch all comments for this post
        const { data, error } = await supabase
          .from('post_comments')
          .select(
            `
            id,
            user_id,
            post_id,
            parent_id,
            content,
            created_at,
            profiles:user_id (
              id,
              username,
              avatar_url
            )
          `
          )
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Organize into tree structure
        const commentsData = (data as unknown as Comment[]) || [];
        const topLevel: Comment[] = [];
        const repliesMap: Record<string, Comment[]> = {};

        commentsData.forEach((comment) => {
          if (comment.parent_id) {
            if (!repliesMap[comment.parent_id]) {
              repliesMap[comment.parent_id] = [];
            }
            repliesMap[comment.parent_id].push(comment);
          } else {
            topLevel.push(comment);
          }
        });

        // Attach replies to parent comments
        topLevel.forEach((comment) => {
          comment.replies = repliesMap[comment.id] || [];
        });

        setComments(topLevel);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [isOpen, postId]);

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
      const commentData = {
        user_id: user.id,
        post_id: postId,
        content: newComment.trim(),
        parent_id: replyTo?.id || null,
      };

      const { data, error } = await supabase
        .from('post_comments')
        .insert(commentData)
        .select(
          `
          id,
          user_id,
          post_id,
          parent_id,
          content,
          created_at,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      const newCommentData = data as unknown as Comment;

      if (replyTo) {
        // Add reply to parent comment
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyTo.id
              ? { ...comment, replies: [...(comment.replies || []), newCommentData] }
              : comment
          )
        );
      } else {
        // Add as top-level comment
        setComments((prev) => [...prev, { ...newCommentData, replies: [] }]);
        // Update comment count
        const newCount = comments.filter((c) => !c.parent_id).length + 1;
        onCommentCountChange?.(newCount);
      }

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = (commentId: string) => {
    // Check if it's a top-level comment
    const isTopLevel = comments.some((c) => c.id === commentId);

    if (isTopLevel) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      const newCount = comments.filter((c) => !c.parent_id && c.id !== commentId).length;
      onCommentCountChange?.(newCount);
    } else {
      // It's a reply - remove from parent
      setComments((prev) =>
        prev.map((comment) => ({
          ...comment,
          replies: comment.replies?.filter((r) => r.id !== commentId),
        }))
      );
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-lg font-semibold text-black dark:text-white">No comments yet</p>
              <p className="text-sm text-gray-500 mt-1">Start the conversation.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onDelete={handleDelete}
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
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <img
              src={user.user_metadata?.avatar_url || 'https://via.placeholder.com/150'}
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
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <span className="text-sm text-gray-500">Log in to comment</span>
          </div>
        )}
      </div>
    </div>
  );
}
