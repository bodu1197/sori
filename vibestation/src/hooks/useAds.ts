'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adsApi, AdPlacement, CreateAdData, AdStatus } from '@/lib/api/ads';

// Query keys
export const adsKeys = {
  all: ['ads'] as const,
  feed: (placement: AdPlacement) => [...adsKeys.all, 'feed', placement] as const,
  campaigns: (advertiserId: string) => [...adsKeys.all, 'campaigns', advertiserId] as const,
  campaignAds: (campaignId: string) => [...adsKeys.all, 'campaignAds', campaignId] as const,
  analytics: (adId: string) => [...adsKeys.all, 'analytics', adId] as const,
};

/**
 * Hook for getting feed ads
 */
export function useFeedAds(placement: AdPlacement = 'feed', limit = 3) {
  return useQuery({
    queryKey: adsKeys.feed(placement),
    queryFn: () => adsApi.getFeedAds(placement, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for getting advertiser campaigns
 */
export function useCampaigns(advertiserId: string) {
  return useQuery({
    queryKey: adsKeys.campaigns(advertiserId),
    queryFn: () => adsApi.getCampaigns(advertiserId),
    enabled: !!advertiserId,
  });
}

/**
 * Hook for getting campaign ads
 */
export function useCampaignAds(campaignId: string) {
  return useQuery({
    queryKey: adsKeys.campaignAds(campaignId),
    queryFn: () => adsApi.getCampaignAds(campaignId),
    enabled: !!campaignId,
  });
}

/**
 * Hook for creating a campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adsApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adsKeys.all });
    },
  });
}

/**
 * Hook for creating an ad
 */
export function useCreateAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdData) => adsApi.createAd(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adsKeys.all });
    },
  });
}

/**
 * Hook for updating ad status
 */
export function useUpdateAdStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ adId, status }: { adId: string; status: AdStatus }) =>
      adsApi.updateAdStatus(adId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adsKeys.all });
    },
  });
}

/**
 * Hook for getting ad analytics
 */
export function useAdAnalytics(adId: string) {
  return useQuery({
    queryKey: adsKeys.analytics(adId),
    queryFn: () => adsApi.getAdAnalytics(adId),
    enabled: !!adId,
  });
}
