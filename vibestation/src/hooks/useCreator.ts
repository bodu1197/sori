'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '@/lib/api/creator';

// Query keys
export const creatorKeys = {
  all: ['creator'] as const,
  profile: () => [...creatorKeys.all, 'profile'] as const,
  stats: () => [...creatorKeys.all, 'stats'] as const,
  earnings: (period: string) => [...creatorKeys.all, 'earnings', period] as const,
  payouts: () => [...creatorKeys.all, 'payouts'] as const,
};

/**
 * Hook for getting creator profile
 */
export function useCreatorProfile() {
  return useQuery({
    queryKey: creatorKeys.profile(),
    queryFn: () => creatorApi.getCreatorProfile(),
  });
}

/**
 * Hook for applying as a creator
 */
export function useApplyAsCreator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => creatorApi.applyAsCreator(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorKeys.all });
    },
  });
}

/**
 * Hook for getting creator stats
 */
export function useCreatorStats() {
  return useQuery({
    queryKey: creatorKeys.stats(),
    queryFn: () => creatorApi.getCreatorStats(),
  });
}

/**
 * Hook for getting earnings breakdown
 */
export function useEarningsBreakdown(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: creatorKeys.earnings(period),
    queryFn: () => creatorApi.getEarningsBreakdown(period),
  });
}

/**
 * Hook for requesting payout
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amount: number) => creatorApi.requestPayout(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorKeys.all });
    },
  });
}

/**
 * Hook for getting payout history
 */
export function usePayoutHistory(limit = 20) {
  return useQuery({
    queryKey: creatorKeys.payouts(),
    queryFn: () => creatorApi.getPayoutHistory(limit),
  });
}

/**
 * Hook for updating payout method
 */
export function useUpdatePayoutMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ method, details }: { method: string; details: Record<string, unknown> }) =>
      creatorApi.updatePayoutMethod(method, details),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorKeys.profile() });
    },
  });
}

/**
 * Hook for toggling subscription
 */
export function useToggleSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enabled, price }: { enabled: boolean; price?: number }) =>
      creatorApi.toggleSubscription(enabled, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorKeys.profile() });
    },
  });
}

/**
 * Hook for subscribing to a creator
 */
export function useSubscribeToCreator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creatorId: string) => creatorApi.subscribeToCreator(creatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorKeys.all });
    },
  });
}

/**
 * Hook for unsubscribing from a creator
 */
export function useUnsubscribeFromCreator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creatorId: string) => creatorApi.unsubscribeFromCreator(creatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorKeys.all });
    },
  });
}
