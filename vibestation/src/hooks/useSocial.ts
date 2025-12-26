'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, FeedOptions, CreatePostData } from '@/lib/api/social';
import type { Post, Comment } from '@/types';

// Profile type from Supabase profiles table
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

// Re-export FeedOptions for convenience
export type { FeedOptions };

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  feed: (options: FeedOptions) => [...socialKeys.all, 'feed', options] as const,
  post: (id: string) => [...socialKeys.all, 'post', id] as const,
  comments: (postId: string) => [...socialKeys.all, 'comments', postId] as const,
  profile: (username: string) => [...socialKeys.all, 'profile', username] as const,
  userPosts: (userId: string) => [...socialKeys.all, 'userPosts', userId] as const,
};

/**
 * Hook for getting feed posts
 */
export function useFeed(options: FeedOptions = {}) {
  return useQuery<Post[], Error>({
    queryKey: socialKeys.feed(options),
    queryFn: () => socialApi.getFeed(options),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook for creating a post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostData) => socialApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

/**
 * Hook for liking/unliking a post
 */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        await socialApi.unlikePost(postId);
      } else {
        await socialApi.likePost(postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

/**
 * Hook for getting comments
 */
export function useComments(postId: string) {
  return useQuery<Comment[], Error>({
    queryKey: socialKeys.comments(postId),
    queryFn: () => socialApi.getComments(postId),
    enabled: !!postId,
  });
}

/**
 * Hook for adding a comment
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      socialApi.addComment(postId, content),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.comments(postId) });
    },
  });
}

/**
 * Hook for following/unfollowing a user
 */
export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, following }: { userId: string; following: boolean }) => {
      if (following) {
        await socialApi.unfollowUser(userId);
      } else {
        await socialApi.followUser(userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

/**
 * Hook for getting user profile
 */
export function useProfile(username: string) {
  return useQuery<Profile, Error>({
    queryKey: socialKeys.profile(username),
    queryFn: () => socialApi.getProfile(username) as Promise<Profile>,
    enabled: !!username,
  });
}

/**
 * Hook for getting user's posts
 */
export function useUserPosts(userId: string) {
  return useQuery<Post[], Error>({
    queryKey: socialKeys.userPosts(userId),
    queryFn: () => socialApi.getUserPosts(userId),
    enabled: !!userId,
  });
}
