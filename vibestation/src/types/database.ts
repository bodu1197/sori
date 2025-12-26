export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';
export type UserLevel = 'newbie' | 'fan' | 'enthusiast' | 'star' | 'legend' | 'vip';
export type PostType = 'image' | 'video' | 'text' | 'music' | 'review';
export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          bio: string | null;
          role: UserRole;
          language: string;
          country: string;
          currency: string;
          points: number;
          level: UserLevel;
          followers_count: number;
          following_count: number;
          posts_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          language?: string;
          country?: string;
          currency?: string;
          points?: number;
          level?: UserLevel;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          language?: string;
          country?: string;
          currency?: string;
          points?: number;
          level?: UserLevel;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      artists: {
        Row: {
          id: string;
          channel_id: string;
          name: string;
          name_i18n: Json;
          thumbnail_url: string | null;
          banner_url: string | null;
          description: string | null;
          description_i18n: Json;
          subscribers: string | null;
          slug: string | null;
          theme: Json;
          platform_followers: number;
          total_posts: number;
          cached_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          name: string;
          name_i18n?: Json;
          thumbnail_url?: string | null;
          banner_url?: string | null;
          description?: string | null;
          description_i18n?: Json;
          subscribers?: string | null;
          slug?: string | null;
          theme?: Json;
          platform_followers?: number;
          total_posts?: number;
          cached_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          name?: string;
          name_i18n?: Json;
          thumbnail_url?: string | null;
          banner_url?: string | null;
          description?: string | null;
          description_i18n?: Json;
          subscribers?: string | null;
          slug?: string | null;
          theme?: Json;
          platform_followers?: number;
          total_posts?: number;
          cached_at?: string;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          artist_id: string | null;
          type: PostType;
          content: string | null;
          content_i18n: Json;
          media_urls: string[] | null;
          music_type: string | null;
          music_id: string | null;
          music_data: Json | null;
          rating: number | null;
          is_ad: boolean;
          ad_data: Json | null;
          views_count: number;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          visibility: string;
          is_pinned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          artist_id?: string | null;
          type: PostType;
          content?: string | null;
          content_i18n?: Json;
          media_urls?: string[] | null;
          music_type?: string | null;
          music_id?: string | null;
          music_data?: Json | null;
          rating?: number | null;
          is_ad?: boolean;
          ad_data?: Json | null;
          views_count?: number;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          visibility?: string;
          is_pinned?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          artist_id?: string | null;
          type?: PostType;
          content?: string | null;
          content_i18n?: Json;
          media_urls?: string[] | null;
          music_type?: string | null;
          music_id?: string | null;
          music_data?: Json | null;
          rating?: number | null;
          is_ad?: boolean;
          ad_data?: Json | null;
          views_count?: number;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          visibility?: string;
          is_pinned?: boolean;
          created_at?: string;
        };
      };
      creators: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          tier: CreatorTier;
          total_plays: number;
          total_earnings: number;
          current_month_plays: number;
          current_month_earnings: number;
          payout_method: string | null;
          payout_details: Json | null;
          min_payout: number;
          subscription_enabled: boolean;
          subscription_price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: string;
          tier?: CreatorTier;
          total_plays?: number;
          total_earnings?: number;
          current_month_plays?: number;
          current_month_earnings?: number;
          payout_method?: string | null;
          payout_details?: Json | null;
          min_payout?: number;
          subscription_enabled?: boolean;
          subscription_price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: string;
          tier?: CreatorTier;
          total_plays?: number;
          total_earnings?: number;
          current_month_plays?: number;
          current_month_earnings?: number;
          payout_method?: string | null;
          payout_details?: Json | null;
          min_payout?: number;
          subscription_enabled?: boolean;
          subscription_price?: number | null;
          created_at?: string;
        };
      };
      advertisers: {
        Row: {
          id: string;
          user_id: string;
          company_name: string | null;
          balance: number;
          total_spent: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name?: string | null;
          balance?: number;
          total_spent?: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string | null;
          balance?: number;
          total_spent?: number;
          status?: string;
          created_at?: string;
        };
      };
      cache: {
        Row: {
          id: string;
          type: string;
          key: string;
          data: Json;
          language: string;
          country: string;
          hit_count: number;
          cached_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          key: string;
          data: Json;
          language?: string;
          country?: string;
          hit_count?: number;
          cached_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          type?: string;
          key?: string;
          data?: Json;
          language?: string;
          country?: string;
          hit_count?: number;
          cached_at?: string;
          expires_at?: string;
        };
      };
      profiles: {
        Row: {
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
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          is_verified?: boolean;
          followers_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          is_verified?: boolean;
          followers_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          likes_count?: number;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      saved_posts: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
