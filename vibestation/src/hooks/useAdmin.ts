'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  users: (page: number, search?: string) => [...adminKeys.all, 'users', page, search] as const,
  posts: (page: number, type?: string) => [...adminKeys.all, 'posts', page, type] as const,
  creators: (page: number, status?: string) => [...adminKeys.all, 'creators', page, status] as const,
  advertisers: (page: number, status?: string) => [...adminKeys.all, 'advertisers', page, status] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
};

/**
 * Hook for getting paginated users
 */
export function useAdminUsers(page = 1, limit = 20, search?: string) {
  return useQuery({
    queryKey: adminKeys.users(page, search),
    queryFn: () => adminApi.getUsers(page, limit, search),
  });
}

/**
 * Hook for updating user role
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * Hook for banning/unbanning users
 */
export function useToggleUserBan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isBanned }: { userId: string; isBanned: boolean }) =>
      adminApi.toggleUserBan(userId, isBanned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * Hook for getting paginated posts
 */
export function useAdminPosts(page = 1, limit = 20, type?: string) {
  return useQuery({
    queryKey: adminKeys.posts(page, type),
    queryFn: () => adminApi.getPosts(page, limit, type),
  });
}

/**
 * Hook for deleting a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => adminApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * Hook for toggling post visibility
 */
export function useTogglePostVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, visibility }: { postId: string; visibility: string }) =>
      adminApi.togglePostVisibility(postId, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * Hook for getting paginated creators
 */
export function useAdminCreators(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: adminKeys.creators(page, status),
    queryFn: () => adminApi.getCreators(page, limit, status),
  });
}

/**
 * Hook for updating creator status
 */
export function useUpdateCreatorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, status }: { creatorId: string; status: string }) =>
      adminApi.updateCreatorStatus(creatorId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * Hook for getting paginated advertisers
 */
export function useAdminAdvertisers(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: adminKeys.advertisers(page, status),
    queryFn: () => adminApi.getAdvertisers(page, limit, status),
  });
}

/**
 * Hook for getting platform statistics
 */
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => adminApi.getStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
