// Admin API functions using Supabase
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client';

const db = () => createClient() as any;

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  level: string;
  points: number;
  followers_count: number;
  posts_count: number;
  created_at: string;
  is_banned?: boolean;
}

export interface AdminPost {
  id: string;
  user_id: string;
  type: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_pinned: boolean;
  visibility: string;
  created_at: string;
  user?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface AdminReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  report_type: 'user' | 'post' | 'comment';
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: {
    username: string;
    display_name: string;
  };
}

export interface AdminCreator {
  id: string;
  user_id: string;
  status: string;
  tier: string;
  total_plays: number;
  total_earnings: number;
  current_month_plays: number;
  current_month_earnings: number;
  created_at: string;
  user?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface AdminAdvertiser {
  id: string;
  user_id: string;
  company_name: string | null;
  balance: number;
  total_spent: number;
  status: string;
  created_at: string;
  user?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const adminApi = {
  /**
   * Get paginated users list
   */
  getUsers: async (
    page = 1,
    limit = 20,
    search?: string
  ): Promise<PaginatedResult<AdminUser>> => {
    const supabase = db();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  },

  /**
   * Update user role
   */
  updateUserRole: async (userId: string, role: string): Promise<void> => {
    const supabase = db();

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Ban/Unban user
   */
  toggleUserBan: async (userId: string, isBanned: boolean): Promise<void> => {
    const supabase = db();

    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: isBanned })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Get paginated posts list
   */
  getPosts: async (
    page = 1,
    limit = 20,
    type?: string
  ): Promise<PaginatedResult<AdminPost>> => {
    const supabase = db();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('posts')
      .select(`
        *,
        user:profiles!posts_user_id_fkey(username, display_name, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  },

  /**
   * Delete a post
   */
  deletePost: async (postId: string): Promise<void> => {
    const supabase = db();

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  },

  /**
   * Toggle post visibility
   */
  togglePostVisibility: async (postId: string, visibility: string): Promise<void> => {
    const supabase = db();

    const { error } = await supabase
      .from('posts')
      .update({ visibility })
      .eq('id', postId);

    if (error) throw error;
  },

  /**
   * Get creators list
   */
  getCreators: async (
    page = 1,
    limit = 20,
    status?: string
  ): Promise<PaginatedResult<AdminCreator>> => {
    const supabase = db();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('creators')
      .select(`
        *,
        user:profiles!creators_user_id_fkey(username, display_name, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  },

  /**
   * Update creator status
   */
  updateCreatorStatus: async (creatorId: string, status: string): Promise<void> => {
    const supabase = db();

    const { error } = await supabase
      .from('creators')
      .update({ status })
      .eq('id', creatorId);

    if (error) throw error;
  },

  /**
   * Get advertisers list
   */
  getAdvertisers: async (
    page = 1,
    limit = 20,
    status?: string
  ): Promise<PaginatedResult<AdminAdvertiser>> => {
    const supabase = db();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('advertisers')
      .select(`
        *,
        user:profiles!advertisers_user_id_fkey(username, display_name, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  },

  /**
   * Get platform statistics
   */
  getStats: async () => {
    const supabase = db();

    const [usersCount, postsCount, creatorsCount, advertisersCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('creators').select('*', { count: 'exact', head: true }),
      supabase.from('advertisers').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalUsers: usersCount.count || 0,
      totalPosts: postsCount.count || 0,
      totalCreators: creatorsCount.count || 0,
      totalAdvertisers: advertisersCount.count || 0,
    };
  },
};
