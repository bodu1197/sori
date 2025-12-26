// Creator Revenue API functions using Supabase
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client';

const db = () => createClient() as any;

export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Creator {
  id: string;
  user_id: string;
  status: string;
  tier: CreatorTier;
  total_plays: number;
  total_earnings: number;
  current_month_plays: number;
  current_month_earnings: number;
  payout_method: string | null;
  payout_details: Record<string, unknown> | null;
  min_payout: number;
  subscription_enabled: boolean;
  subscription_price: number | null;
  created_at: string;
  user?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface Payout {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  payout_method: string;
  payout_details: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

export interface EarningsBreakdown {
  plays: number;
  subscriptions: number;
  tips: number;
  ads: number;
  total: number;
}

export interface CreatorStats {
  total_plays: number;
  total_earnings: number;
  current_month_plays: number;
  current_month_earnings: number;
  subscribers_count: number;
  available_balance: number;
  pending_payout: number;
}

// Tier thresholds (plays per month)
export const TIER_THRESHOLDS: Record<CreatorTier, number> = {
  bronze: 0,
  silver: 1000,
  gold: 10000,
  platinum: 100000,
  diamond: 1000000,
};

// Revenue share percentage per tier
export const TIER_REVENUE_SHARE: Record<CreatorTier, number> = {
  bronze: 0.50,
  silver: 0.55,
  gold: 0.60,
  platinum: 0.70,
  diamond: 0.80,
};

export const creatorApi = {
  /**
   * Get creator profile
   */
  getCreatorProfile: async (): Promise<Creator | null> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('creators')
      .select(`
        *,
        user:profiles!creators_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  },

  /**
   * Apply to become a creator
   */
  applyAsCreator: async (): Promise<Creator> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('creators')
      .insert({
        user_id: user.id,
        status: 'pending',
        tier: 'bronze',
        total_plays: 0,
        total_earnings: 0,
        current_month_plays: 0,
        current_month_earnings: 0,
        min_payout: 50,
        subscription_enabled: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get creator stats
   */
  getCreatorStats: async (): Promise<CreatorStats | null> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: creator } = await supabase
      .from('creators')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!creator) return null;

    // Get subscriber count
    const { count: subscribersCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creator.id)
      .eq('status', 'active');

    // Calculate available balance (total - pending payouts - completed payouts)
    const { data: payouts } = await supabase
      .from('payouts')
      .select('amount, status')
      .eq('creator_id', creator.id)
      .in('status', ['pending', 'processing', 'completed']);

    const paidOut = (payouts || [])
      .filter((p: { status: string }) => p.status === 'completed')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    const pendingPayout = (payouts || [])
      .filter((p: { status: string }) => ['pending', 'processing'].includes(p.status))
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    const availableBalance = creator.total_earnings - paidOut - pendingPayout;

    return {
      total_plays: creator.total_plays,
      total_earnings: creator.total_earnings,
      current_month_plays: creator.current_month_plays,
      current_month_earnings: creator.current_month_earnings,
      subscribers_count: subscribersCount || 0,
      available_balance: availableBalance,
      pending_payout: pendingPayout,
    };
  },

  /**
   * Get earnings breakdown
   */
  getEarningsBreakdown: async (period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<EarningsBreakdown> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // In production, this would aggregate from earnings table
    // For now, return mock data structure
    return {
      plays: 0,
      subscriptions: 0,
      tips: 0,
      ads: 0,
      total: 0,
    };
  },

  /**
   * Request payout
   */
  requestPayout: async (amount: number): Promise<Payout> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data: creator } = await supabase
      .from('creators')
      .select('id, payout_method, payout_details, min_payout')
      .eq('user_id', user.id)
      .single();

    if (!creator) throw new Error('Not a creator');
    if (!creator.payout_method) throw new Error('No payout method configured');
    if (amount < creator.min_payout) throw new Error(`Minimum payout is $${creator.min_payout}`);

    const { data, error } = await supabase
      .from('payouts')
      .insert({
        creator_id: creator.id,
        amount,
        currency: 'USD',
        status: 'pending',
        payout_method: creator.payout_method,
        payout_details: creator.payout_details,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get payout history
   */
  getPayoutHistory: async (limit = 20): Promise<Payout[]> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) return [];

    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Update payout method
   */
  updatePayoutMethod: async (method: string, details: Record<string, unknown>): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('creators')
      .update({
        payout_method: method,
        payout_details: details,
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Toggle subscription
   */
  toggleSubscription: async (enabled: boolean, price?: number): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('creators')
      .update({
        subscription_enabled: enabled,
        subscription_price: enabled ? (price || 4.99) : null,
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Subscribe to a creator
   */
  subscribeToCreator: async (creatorId: string): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        creator_id: creatorId,
        status: 'active',
        price: 4.99, // Would be fetched from creator's subscription_price
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (error && error.code !== '23505') throw error;
  },

  /**
   * Unsubscribe from a creator
   */
  unsubscribeFromCreator: async (creatorId: string): Promise<void> => {
    const supabase = db();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('creator_id', creatorId);

    if (error) throw error;
  },
};
