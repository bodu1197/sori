const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

export interface SearchOptions {
  filter?: 'songs' | 'albums' | 'artists';
  limit?: number;
}

export interface SearchResult {
  videoId?: string;
  title?: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  duration?: string;
  browseId?: string;
  year?: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface NoembedResponse {
  error?: string;
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

interface SearchApiResponse {
  results?: SearchResult[];
}

export async function searchMusic(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { filter = 'songs', limit = 20 } = options;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&filter=${filter}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: SearchApiResponse = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function getVideoInfo(videoId: string): Promise<VideoInfo | null> {
  try {
    const response = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    const data: NoembedResponse = await response.json();

    if (data.error) return null;

    return {
      videoId,
      title: data.title || 'Unknown',
      artist: data.author_name?.replace(/\s*-\s*Topic$/, '').trim() || 'Unknown Artist',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}
