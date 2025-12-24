import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  parent_id?: string;
  content: string;
  image_url?: string;
  video_url?: string;
  created_at: string;
  like_count?: number;
  profiles?: Profile;
  replies?: Comment[];
}

// Helper: Remove comment from replies
function removeFromReplies(comment: Comment, commentId: string): Comment {
  return {
    ...comment,
    replies: comment.replies?.filter((r) => r.id !== commentId),
  };
}

// Helper: Update comments after deletion
function updateCommentsAfterDelete(prev: Comment[], commentId: string): Comment[] {
  const isTopLevel = prev.some((c) => c.id === commentId);
  if (isTopLevel) {
    return prev.filter((c) => c.id !== commentId);
  }
  return prev.map((c) => removeFromReplies(c, commentId));
}

export function useComments(postId: string) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
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
            video_url,
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
        .order('created_at', { ascending: false }); // Newest first

      if (error) throw error;

      // Organize into tree
      const commentsData = (data as unknown as Comment[]) || [];
      const topLevel: Comment[] = [];
      const repliesMap: Record<string, Comment[]> = {};

      commentsData.forEach((comment) => {
        if (comment.parent_id) {
          if (!repliesMap[comment.parent_id]) {
            repliesMap[comment.parent_id] = [];
          }
          // Use unshift to keep newest reply at top if desired, or push for chronological.
          // Usually replies are chronological?
          // Original code: replies push.
          repliesMap[comment.parent_id].push(comment);
        } else {
          topLevel.push(comment);
        }
      });

      // Sort replies chronologically (Oldest first) usually better for conversation flow?
      // Original code did not sort replies specifically but fetched with 'created_at desc'.
      // If we want replies to be chronological (old -> new), we should reverse them or sort.
      // Let's keep original behavior: they come in desc order (Newest first).

      topLevel.forEach((comment) => {
        comment.replies = repliesMap[comment.id] || [];
      });

      setComments(topLevel);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(
    async (
      content: string,
      parentId?: string | null,
      imageUrl?: string | null,
      videoUrl?: string | null
    ) => {
      if (!user) return null;

      try {
        const commentData = {
          user_id: user.id,
          post_id: postId,
          content,
          parent_id: parentId || null,
          image_url: imageUrl || null,
          video_url: videoUrl || null,
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
            video_url,
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
        const newComment = data as unknown as Comment;

        if (parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: [newComment, ...(c.replies || [])] } // Newest reply at top
                : c
            )
          );
        } else {
          setComments((prev) => [newComment, ...prev]);
        }
        return newComment;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [postId, user]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments((prev) => updateCommentsAfterDelete(prev, commentId));
    } catch (err) {
      console.error(err);
    }
  }, []);

  return { comments, loading, fetchComments, addComment, deleteComment };
}
