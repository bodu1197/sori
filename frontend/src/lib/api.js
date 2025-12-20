// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sori-backend-xxxxxxxxxx-uc.a.run.app';

/**
 * Search music using backend API (YouTube Music)
 */
export async function searchMusic(query, options = {}) {
  const { filter = 'songs', limit = 20 } = options;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&filter=${filter}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Music search error:', error);
    return [];
  }
}

/**
 * Fallback: Search using noembed (for single video info)
 */
export async function getVideoInfo(videoId) {
  try {
    const response = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    const data = await response.json();

    if (data.error) return null;

    return {
      videoId,
      title: data.title,
      artist: data.author_name?.replace(/\s*-\s*Topic$/, '').trim() || 'Unknown Artist',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (error) {
    console.error('Video info error:', error);
    return null;
  }
}
