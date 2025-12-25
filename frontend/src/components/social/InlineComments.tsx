import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';
import { useComments } from './useComments';
import CommentCard from './CommentCard';
import CommentInput from './CommentInput';

interface InlineCommentsProps {
  readonly postId: string;
  readonly initialCount?: number;
  readonly onCommentCountChange?: (count: number) => void;
}

export default function InlineComments({
  postId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialCount = 0,
  onCommentCountChange,
}: InlineCommentsProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { comments, loading, addComment, deleteComment } = useComments(postId);

  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const VISIBLE_COMMENTS = 3;
  const visibleComments = showAllComments ? comments : comments.slice(0, VISIBLE_COMMENTS);
  const hiddenCount = comments.length - VISIBLE_COMMENTS;

  const handleReply = (parentId: string, username: string) => {
    setReplyTo({ id: parentId, username });
    setIsExpanded(true);
  };

  const handleCommentSubmit = async (
    content: string,
    imageFile: File | null,
    videoFile: File | null
  ) => {
    let imageUrl = null;
    let videoUrl = null;

    // Upload Media
    if (imageFile) {
      const fileName = `comments/${postId}/${Date.now()}_${imageFile.name}`;
      const { data, error } = await supabase.storage
        .from('comment-media')
        .upload(fileName, imageFile);
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('comment-media').getPublicUrl(data.path);
        imageUrl = urlData.publicUrl;
      }
    }

    if (videoFile) {
      const fileName = `comments/${postId}/${Date.now()}_${videoFile.name}`;
      const { data, error } = await supabase.storage
        .from('comment-media')
        .upload(fileName, videoFile);
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('comment-media').getPublicUrl(data.path);
        videoUrl = urlData.publicUrl;
      }
    }

    const result = await addComment(content, replyTo?.id, imageUrl, videoUrl);
    if (result) {
      // Success
      // Check if top level
      if (!replyTo?.id) {
        onCommentCountChange?.(comments.length + 1);
      }
      setReplyTo(null);
    }
  };

  const handleDeleteWrapper = (commentId: string) => {
    // Check if top level for count update
    const isTopLevel = comments.some((c) => c.id === commentId);
    deleteComment(commentId);
    if (isTopLevel) {
      onCommentCountChange?.(comments.length - 1);
    }
  };

  return (
    <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800">
      {/* Comments List */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      {!loading && comments.length > 0 && (
        <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {visibleComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onDelete={handleDeleteWrapper}
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
                  {t('comments.showMore', 'View')} {hiddenCount}{' '}
                  {t('comments.moreComments', 'more comments')}
                </>
              )}
            </button>
          )}
        </div>
      )}
      {!loading && comments.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-3">
          {t('comments.noComments', 'No comments yet')}
        </p>
      )}

      {/* Comment Input */}
      {user && (
        <CommentInput
          onSubmit={handleCommentSubmit}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          isExpanded={isExpanded}
          onToggleExpand={setIsExpanded}
        />
      )}
    </div>
  );
}
