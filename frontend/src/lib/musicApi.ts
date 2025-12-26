// VibeStation - Music API Client
// ytmusicapi 서버리스 함수 호출

const API_BASE = '/api/music';

interface SearchResult {
  success: boolean;
  query: string;
  filter: string | null;
  count: number;
  results: MusicItem[];
}

interface MusicItem {
  videoId?: string;
  browseId?: string;
  title: string;
  artists?: { name: string; id: string }[];
  album?: { name: string; id: string };
  thumbnails?: { url: string; width: number; height: number }[];
  duration?: string;
  resultType?: string;
}

interface ArtistInfo {
  success: boolean;
  artist: {
    name: string;
    description: string;
    views: string;
    subscribers: string;
    thumbnails: { url: string; width: number; height: number }[];
    songs: MusicItem[];
    albums: MusicItem[];
    videos: MusicItem[];
    related: MusicItem[];
  };
}

interface ChartsData {
  success: boolean;
  country: string;
  charts: {
    videos: MusicItem[];
    artists: MusicItem[];
    trending: MusicItem[];
  };
}

interface MoodsData {
  success: boolean;
  categories?: { title: string; params: string }[];
  playlists?: MusicItem[];
}

interface SongData {
  success: boolean;
  song: {
    videoId: string;
    title: string;
    author: string;
    lengthSeconds: string;
    viewCount: string;
    thumbnail: { url: string }[];
    description: string;
  };
  lyrics?: {
    text: string;
    source: string;
  } | null;
}

interface HomeData {
  success: boolean;
  sections: {
    title: string;
    contents: MusicItem[];
  }[];
}

// API Functions
export async function searchMusic(
  query: string,
  filter?: 'songs' | 'videos' | 'albums' | 'artists' | 'playlists',
  limit = 20
): Promise<SearchResult> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (filter) params.set('filter', filter);

  const response = await fetch(`${API_BASE}/search?${params}`);
  return response.json();
}

export async function getArtist(artistId: string): Promise<ArtistInfo> {
  const response = await fetch(`${API_BASE}/artist?id=${artistId}`);
  return response.json();
}

export async function getCharts(country = 'KR'): Promise<ChartsData> {
  const response = await fetch(`${API_BASE}/charts?country=${country}`);
  return response.json();
}

export async function getMoods(params?: string): Promise<MoodsData> {
  const url = params
    ? `${API_BASE}/moods?params=${encodeURIComponent(params)}`
    : `${API_BASE}/moods`;
  const response = await fetch(url);
  return response.json();
}

export async function getSong(videoId: string, includeLyrics = false): Promise<SongData> {
  const params = new URLSearchParams({ id: videoId });
  if (includeLyrics) params.set('lyrics', 'true');

  const response = await fetch(`${API_BASE}/song?${params}`);
  return response.json();
}

export async function getHome(): Promise<HomeData> {
  const response = await fetch(`${API_BASE}/home`);
  return response.json();
}

// Export types
export type { SearchResult, MusicItem, ArtistInfo, ChartsData, MoodsData, SongData, HomeData };
