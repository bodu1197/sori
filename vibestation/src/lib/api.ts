const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-psi-sable-33.vercel.app';

export async function fetchAPI(endpoint: string) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) {
      return { success: false, data: null, error: `HTTP ${res.status}` };
    }
    return res.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, data: null, error: String(error) };
  }
}

export const api = {
  // Home
  getHome: (limit = 5) => fetchAPI(`/api/home?limit=${limit}`),

  // Search
  search: (query: string, filter?: string) =>
    fetchAPI(`/api/search?q=${encodeURIComponent(query)}${filter ? `&filter=${filter}` : ''}`),
  getSuggestions: (query: string) =>
    fetchAPI(`/api/search/suggestions?q=${encodeURIComponent(query)}`),

  // Explore
  getExplore: () => fetchAPI('/api/explore'),

  // Charts
  getCharts: (country = 'ZZ') => fetchAPI(`/api/charts?country=${country}`),

  // Moods
  getMoods: () => fetchAPI('/api/moods'),
  getMoodPlaylists: (params: string) => fetchAPI(`/api/mood-playlists?params=${encodeURIComponent(params)}`),

  // Artist
  getArtist: (id: string) => fetchAPI(`/api/artist/${id}`),
  getArtistAlbums: (id: string) => fetchAPI(`/api/artist/${id}/albums`),

  // Album
  getAlbum: (id: string) => fetchAPI(`/api/album/${id}`),

  // Song
  getSong: (videoId: string) => fetchAPI(`/api/song/${videoId}`),
  getWatch: (videoId: string) => fetchAPI(`/api/watch?videoId=${videoId}`),
  getLyrics: (browseId: string) => fetchAPI(`/api/lyrics/${browseId}`),
  getRelated: (browseId: string) => fetchAPI(`/api/related/${browseId}`),

  // Podcast
  getPodcast: (id: string) => fetchAPI(`/api/podcast/${id}`),
  getEpisode: (id: string) => fetchAPI(`/api/episode/${id}`),
  getChannel: (id: string) => fetchAPI(`/api/channel/${id}`),
  getEpisodesPlaylist: () => fetchAPI('/api/episodes-playlist'),

  // Playlist
  getPlaylist: (id: string) => fetchAPI(`/api/playlist/${id}`),
};
