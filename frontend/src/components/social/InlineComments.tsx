import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Image as ImageIcon,
  X,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';
import { DEFAULT_AVATAR } from '../common';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_id?: string;
  content: string;
  image_url?: string;
  created_at: string;
  like_count?: number;
  profiles?: Profile;
  replies?: Comment[];
}

interface InlineCommentsProps {
  readonly postId: string;
  readonly initialCount?: number;
  readonly onCommentCountChange?: (count: number) => void;
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

// Single Comment Component with post-like actions
function CommentCard({
  comment,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: Comment;
  onReply: (parentId: string, username: string) => void;
  onDelete: (commentId: string) => void;
  isReply?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: comment.content,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('comments.deleteConfirm', 'Delete this comment?'))) return;
    try {
      await supabase.from('post_comments').delete().eq('id', comment.id);
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
          <button onClick={handleShare} className="text-gray-500 hover:text-green-500 transition">
            <Share2 size={16} />
          </button>
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

export default function InlineComments({
  postId,
  initialCount = 0,
  onCommentCountChange,
}: InlineCommentsProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const VISIBLE_COMMENTS = 5;

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      if (!postId) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .select(
            `
            id,
            user_id,
            post_id,
            parent_id,
            content,
            image_url,
            created_at,
            like_count,
            profiles:post_comments_user_id_profiles_fkey (
              id,
              username,
              avatar_url,
              full_name
            )
          `
          )
          .eq('post_id', postId)
          .order('created_at', { ascending: false });

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
  }, [postId]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle reply
  const handleReply = (parentId: string, username: string) => {
    setReplyTo({ id: parentId, username });
    setNewComment(`@${username} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
    setNewComment('');
  };

  // Submit comment
  const handleSubmit = async () => {
    if (!user?.id || (!newComment.trim() && !imageFile) || submitting) return;

    setSubmitting(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (imageFile) {
        const fileName = `comment_${Date.now()}_${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(uploadData.path);

        imageUrl = urlData.publicUrl;
      }

      const commentData = {
        user_id: user.id,
        post_id: postId,
        content: newComment.trim(),
        image_url: imageUrl,
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
          image_url,
          created_at,
          like_count,
          profiles:post_comments_user_id_profiles_fkey (
            id,
            username,
            avatar_url,
            full_name
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
              ? { ...comment, replies: [newCommentData, ...(comment.replies || [])] }
              : comment
          )
        );
      } else {
        // Add as top-level comment (at the beginning)
        setComments((prev) => [{ ...newCommentData, replies: [] }, ...prev]);
        const newCount = comments.length + 1;
        onCommentCountChange?.(newCount);
      }

      setNewComment('');
      setReplyTo(null);
      removeImage();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = (commentId: string) => {
    const isTopLevel = comments.some((c) => c.id === commentId);

    if (isTopLevel) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      const newCount = comments.length - 1;
      onCommentCountChange?.(newCount);
    } else {
      setComments((prev) =>
        prev.map((comment) => ({
          ...comment,
          replies: comment.replies?.filter((r) => r.id !== commentId),
        }))
      );
    }
  };

  const visibleComments = showAllComments ? comments : comments.slice(0, VISIBLE_COMMENTS);
  const hiddenCount = comments.length - VISIBLE_COMMENTS;

  return (
    <div className="px-3 pb-3">
      {/* Comment Input */}
      {user ? (
        <div className="flex gap-3 py-3 border-t border-gray-100 dark:border-gray-800">
          <img
            src={user.user_metadata?.avatar_url || DEFAULT_AVATAR}
            alt="You"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1">
            {/* Reply indicator */}
            {replyTo && (
              <div className="flex items-center justify-between mb-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                <span>
                  {t('comments.replyingTo', 'Replying to')}{' '}
                  <span className="font-semibold">@{replyTo.username}</span>
                </span>
                <button onClick={cancelReply} className="text-blue-500 ml-2">
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            )}

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mb-2 inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={t('comments.addComment', 'Add a comment...')}
                rows={1}
                className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder-gray-400 outline-none resize-none max-h-20"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ImageIcon size={20} />
              </button>
              <button
                onClick={handleSubmit}
                disabled={(!newComment.trim() && !imageFile) || submitting}
                className={`text-blue-500 ${
                  (!newComment.trim() && !imageFile) || submitting
                    ? 'opacity-50'
                    : 'hover:text-blue-600'
                }`}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : comments.length > 0 ? (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {visibleComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ))}

          {/* Show more/less button */}
          {comments.length > VISIBLE_COMMENTS && (
            <button
              onClick={() => setShowAllComments(!showAllComments)}
              className="w-full py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1"
            >
              {showAllComments ? (
                <>
                  <ChevronUp size={16} />
                  {t('comments.showLess', 'Show less')}
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  {t('comments.showMore', 'Show')} {hiddenCount}{' '}
                  {t('comments.moreComments', 'more comments')}
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 py-4">
          {t('comments.noComments', 'No comments yet. Be the first!')}
        </p>
      )}
    </div>
  );
}
