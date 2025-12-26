// Advertising API functions using Supabase
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client';

const db = () => createClient() as any;

export type AdType = 'image' | 'video' | 'carousel' | 'music';
export type AdStatus = 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
export type AdPlacement = 'feed' | 'story' | 'explore' | 'artist_page';
export type BillingType = 'cpm' | 'cpc' | 'cpa';

export interface Ad {
  id: string;
  advertiser_id: string;
  campaign_id: string;
  type: AdType;
  title: string;
  content: string | null;
  media_urls: string[];
  cta_text: string;
  cta_url: string;
  placement: AdPlacement[];
  targeting: AdTargeting;
  budget_daily: number;
  budget_total: number;
  billing_type: BillingType;
  bid_amount: number;
  status: AdStatus;
  start_date: string;
  end_date: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spent: number;
  created_at: string;
  advertiser?: {
    company_name: string;
    user?: {
      username: string;
      avatar_url: string | null;
    };
  };
}

export interface AdTargeting {
  countries?: string[];
  languages?: string[];
  age_min?: number;
  age_max?: number;
  genders?: ('male' | 'female' | 'other')[];
  interests?: string[];
  artists?: string[];
  genres?: string[];
}

export interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  objective: 'awareness' | 'engagement' | 'conversions' | 'app_installs';
  status: AdStatus;
  budget_total: number;
  spent: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface CreateAdData {
  campaign_id: string;
  type: AdType;
  title: string;
  content?: string;
  media_urls: string[];
  cta_text: string;
  cta_url: string;
  placement: AdPlacement[];
  targeting: AdTargeting;
  budget_daily: number;
  budget_total: number;
  billing_type: BillingType;
  bid_amount: number;
  start_date: string;
  end_date?: string;
}

export const adsApi = {
  /**
   * Get ads for feed (user-facing)
   */
  getFeedAds: async (placement: AdPlacement = 'feed', limit = 3): Promise<Ad[]> => {
    const supabase = db();

    // In production, this would include targeting logic
    const { data, error } = await supabase
      .from('ads')
      .select(`
        *,
        advertiser:advertisers!ads_advertiser_id_fkey(
          company_name,
          user:profiles!advertisers_user_id_fkey(username, avatar_url)
        )
      `)
      .eq('status', 'active')
      .contains('placement', [placement])
      .order('bid_amount', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Record ad impression
   */
  recordImpression: async (adId: string): Promise<void> => {
    const supabase = db();

    await supabase.rpc('increment_ad_impressions', { ad_id: adId });
  },

  /**
   * Record ad click
   */
  recordClick: async (adId: string): Promise<void> => {
    const supabase = db();

    await supabase.rpc('increment_ad_clicks', { ad_id: adId });
  },

  /**
   * Get advertiser's campaigns
   */
  getCampaigns: async (advertiserId: string): Promise<Campaign[]> => {
    const supabase = db();

    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', advertiserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new campaign
   */
  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Get advertiser ID
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!advertiser) throw new Error('Not an advertiser');

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        ...data,
        advertiser_id: advertiser.id,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return campaign;
  },

  /**
   * Get campaign ads
   */
  getCampaignAds: async (campaignId: string): Promise<Ad[]> => {
    const supabase = db();

    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new ad
   */
  createAd: async (data: CreateAdData): Promise<Ad> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Get advertiser ID
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!advertiser) throw new Error('Not an advertiser');

    const { data: ad, error } = await supabase
      .from('ads')
      .insert({
        ...data,
        advertiser_id: advertiser.id,
        status: 'pending',
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spent: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return ad;
  },

  /**
   * Update ad status
   */
  updateAdStatus: async (adId: string, status: AdStatus): Promise<void> => {
    const supabase = db();

    const { error } = await supabase
      .from('ads')
      .update({ status })
      .eq('id', adId);

    if (error) throw error;
  },

  /**
   * Get ad analytics
   */
  getAdAnalytics: async (adId: string) => {
    const supabase = db();

    const { data, error } = await supabase
      .from('ads')
      .select('impressions, clicks, conversions, spent, budget_total, budget_daily')
      .eq('id', adId)
      .single();

    if (error) throw error;

    return {
      ...data,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cvr: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
      cpm: data.impressions > 0 ? (data.spent / data.impressions) * 1000 : 0,
      cpc: data.clicks > 0 ? data.spent / data.clicks : 0,
    };
  },
};
