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

// =============================================================================
// Translation API
// =============================================================================

export interface TranslationResult {
  translated_text: string;
  source_language: string;
  cached: boolean;
  same_language?: boolean;
}

export interface LanguageDetectionResult {
  language: string;
  language_name: string;
}

export async function translateText(
  text: string,
  targetLanguage: string,
  postId?: string,
  sourceLanguage?: string
): Promise<TranslationResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        post_id: postId,
        source_language: sourceLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
}

export async function detectLanguage(text: string): Promise<LanguageDetectionResult | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/detect-language`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Language detection API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Language detection error:', error);
    return null;
  }
}

export async function getCachedTranslation(
  postId: string,
  targetLanguage: string
): Promise<TranslationResult | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/translate/cached/${postId}?target_language=${targetLanguage}`
    );

    if (!response.ok) {
      throw new Error(`Get cached translation error: ${response.status}`);
    }

    const data = await response.json();
    return data.translated_text ? data : null;
  } catch (error) {
    console.error('Get cached translation error:', error);
    return null;
  }
}

// =============================================================================
// Video Info API
// =============================================================================

/**
 * Sanitize artist name by removing " - Topic" suffix
 * Uses string methods instead of regex for better security
 */
function sanitizeArtistName(name: string | undefined): string {
  if (!name) return '';

  // Check for " - Topic" suffix and remove it
  const topicSuffix = ' - Topic';
  const dashTopicSuffix = '- Topic';

  let sanitized = name.trim();

  if (sanitized.endsWith(topicSuffix)) {
    sanitized = sanitized.slice(0, -topicSuffix.length);
  } else if (sanitized.endsWith(dashTopicSuffix)) {
    sanitized = sanitized.slice(0, -dashTopicSuffix.length);
  }

  return sanitized.trim();
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
      artist: sanitizeArtistName(data.author_name) || 'Unknown Artist',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}
