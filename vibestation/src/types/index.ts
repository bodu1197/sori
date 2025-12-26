export * from './database';

// Music Types (from ytmusicapi)
export interface Artist {
  browseId: string;
  name: string;
  thumbnail: string;
  subscribers?: string;
  description?: string;
  albums?: Album[];
  songs?: Song[];
}

export interface Album {
  browseId: string;
  title: string;
  artists: { name: string; id: string }[];
  year?: string;
  thumbnail: string;
  tracks?: Song[];
}

export interface Song {
  videoId: string;
  title: string;
  artists: { name: string; id: string }[];
  album?: { name: string; id: string };
  thumbnail: string;
  duration?: string;
  isExplicit?: boolean;
}

export interface SearchResult {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  videos: Song[];
}

export interface Chart {
  title: string;
  videos: Song[];
  artists: Artist[];
}

export interface MoodCategory {
  title: string;
  params: string;
}

// Player Types
export interface PlayerState {
  currentTrack: Song | null;
  queue: Song[];
  isPlaying: boolean;
  volume: number;
  repeat: 'off' | 'one' | 'all';
  shuffle: boolean;
}

// Social Types
export interface Post {
  id: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  artist?: {
    id: string;
    name: string;
    thumbnail_url: string;
  };
  type: 'image' | 'video' | 'text' | 'music' | 'review';
  content: string;
  media_urls: string[];
  music_data?: Song | Album;
  rating?: number;
  is_ad: boolean;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface Comment {
  id: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  content: string;
  likes_count: number;
  created_at: string;
  is_liked?: boolean;
}

// Commerce Types
export interface Shop {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  banner_url: string;
  products_count: number;
  rating: number;
}

export interface Product {
  id: string;
  shop_id: string;
  title: string;
  description: string;
  images: string[];
  prices: Record<string, number>;
  stock: number;
  artist_id?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'order' | 'tip' | 'payout';
  title: string;
  body: string;
  actor?: {
    id: string;
    username: string;
    avatar_url: string;
  };
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}
