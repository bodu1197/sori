// Social API functions using Supabase
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client';
import type { Post, Comment } from '@/types';

// Type helper for Supabase queries with untyped tables
const db = () => createClient() as any;

export interface CreatePostData {
  type: 'image' | 'video' | 'text' | 'music' | 'review';
  content: string;
  media_urls?: string[];
  music_data?: {
    videoId?: string;
    browseId?: string;
    title: string;
    artist: string;
    thumbnail?: string;
  };
  rating?: number;
  artist_id?: string;
}

export interface FeedOptions {
  type?: 'all' | 'following' | 'trending' | 'artist';
  artistId?: string;
  limit?: number;
  offset?: number;
}

export const socialApi = {
  /**
   * Get feed posts
   */
  getFeed: async (options: FeedOptions = {}): Promise<Post[]> => {
    const supabase = db();
    const { type = 'all', artistId, limit = 20, offset = 0 } = options;

    let query = supabase
      .from('posts')
      .select(`
        *,
        user:profiles!posts_user_id_fkey(id, username, display_name, avatar_url),
        artist:artists!posts_artist_id_fkey(id, name, thumbnail_url),
        likes:post_likes(user_id),
        saves:saved_posts(user_id)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type === 'artist' && artistId) {
      query = query.eq('artist_id', artistId);
    }

    if (type === 'trending') {
      query = query.order('likes_count', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get current user for checking likes/saves
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    return (data || []).map((post: Record<string, unknown>) => ({
      ...post,
      is_liked: userId ? (post.likes as { user_id: string }[])?.some((l) => l.user_id === userId) : false,
      is_saved: userId ? (post.saves as { user_id: string }[])?.some((s) => s.user_id === userId) : false,
    })) as unknown as Post[];
  },

  /**
   * Create a new post
   */
  createPost: async (data: CreatePostData): Promise<Post> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        type: data.type,
        content: data.content || null,
        media_urls: data.media_urls || null,
        music_data: data.music_data ? JSON.parse(JSON.stringify(data.music_data)) : null,
        rating: data.rating || null,
        artist_id: data.artist_id || null,
      })
      .select(`
        *,
        user:profiles!posts_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return post as unknown as Post;
  },

  /**
   * Like a post
   */
  likePost: async (postId: string): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: user.id });

    if (error && error.code !== '23505') throw error; // Ignore duplicate
  },

  /**
   * Unlike a post
   */
  unlikePost: async (postId: string): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Get comments for a post
   */
  getComments: async (postId: string): Promise<Comment[]> => {
    const supabase = db();

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as unknown as Comment[];
  },

  /**
   * Add a comment
   */
  addComment: async (postId: string, content: string): Promise<Comment> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, content })
      .select(`
        *,
        user:profiles!comments_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data as unknown as Comment;
  },

  /**
   * Follow a user
   */
  followUser: async (userId: string): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: userId });

    if (error && error.code !== '23505') throw error;
  },

  /**
   * Unfollow a user
   */
  unfollowUser: async (userId: string): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) throw error;
  },

  /**
   * Get user profile
   */
  getProfile: async (username: string) => {
    const supabase = db();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get user's posts
   */
  getUserPosts: async (userId: string, limit = 20, offset = 0): Promise<Post[]> => {
    const supabase = db();

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:profiles!posts_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as unknown as Post[];
  },
};
