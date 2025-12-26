// Music API client for ytmusicapi serverless functions

export interface MusicApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SearchResult {
  resultType: 'song' | 'video' | 'album' | 'artist' | 'playlist';
  title: string;
  artists?: Array<{ name: string; id: string }>;
  album?: { name: string; id: string };
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  videoId?: string;
  browseId?: string;
  duration?: string;
  duration_seconds?: number;
  views?: string;
  subscribers?: string;
}

export interface ArtistData {
  name: string;
  description?: string;
  views?: string;
  subscribers?: string;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  songs?: {
    browseId: string;
    results: SearchResult[];
  };
  albums?: {
    browseId: string;
    results: Array<{
      title: string;
      year?: string;
      browseId: string;
      thumbnails?: Array<{ url: string; width: number; height: number }>;
    }>;
  };
  videos?: {
    browseId: string;
    results: SearchResult[];
  };
}

export interface ChartItem {
  title: string;
  videoId?: string;
  artists?: Array<{ name: string; id: string }>;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  views?: string;
  rank?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ChartsData {
  countries?: Record<string, string>;
  songs?: {
    items: ChartItem[];
    playlist?: string;
  };
  videos?: {
    items: ChartItem[];
    playlist?: string;
  };
  artists?: {
    items: Array<{
      title: string;
      browseId: string;
      subscribers?: string;
      thumbnails?: Array<{ url: string; width: number; height: number }>;
    }>;
  };
  trending?: {
    items: ChartItem[];
    playlist?: string;
  };
}

export type SearchFilter = 'songs' | 'videos' | 'albums' | 'artists' | 'playlists' | null;

const API_BASE = '/api/music';

async function fetchApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(endpoint, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString());
  const result: MusicApiResponse<T> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'API request failed');
  }

  return result.data;
}

export const musicApi = {
  /**
   * Search for music
   * @param query - Search query
   * @param filter - Filter by type (songs, videos, albums, artists, playlists)
   * @param limit - Max results to return
   */
  search: async (query: string, filter?: SearchFilter, limit = 20): Promise<SearchResult[]> => {
    return fetchApi<SearchResult[]>(`${API_BASE}/search`, {
      q: query,
      ...(filter && { filter }),
      limit: String(limit),
    });
  },

  /**
   * Get artist info
   * @param channelId - YouTube Music channel/browse ID
   */
  getArtist: async (channelId: string): Promise<ArtistData> => {
    return fetchApi<ArtistData>(`${API_BASE}/artist`, {
      id: channelId,
    });
  },

  /**
   * Get music charts
   * @param country - Country code (e.g., 'KR', 'US', 'JP') or 'ZZ' for global
   */
  getCharts: async (country = 'ZZ'): Promise<ChartsData> => {
    return fetchApi<ChartsData>(`${API_BASE}/charts`, {
      country,
    });
  },
};
