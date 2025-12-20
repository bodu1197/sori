// @ts-nocheck
import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import axios from 'axios';

// API URL
const API_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

// Query Client
const queryClient = new QueryClient();

// API functions
const api = {
  search: (query, filter = 'songs') =>
    axios.get(`${API_URL}/api/search`, { params: { q: query, filter, limit: 20 } }),
  charts: (country = 'US') => axios.get(`${API_URL}/api/charts`, { params: { country } }),
  newAlbums: (country = 'US') => axios.get(`${API_URL}/api/new-albums`, { params: { country } }),
};

// Search Component
function SearchSection() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => api.search(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(query);
  };

  const results = data?.data?.results || [];

  return (
    <div className="mb-8">
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists, songs, albums..."
          className="flex-1 px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
        />
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </form>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="text-red-400 text-center py-4">An error occurred while searching.</div>
      )}

      {results.length > 0 && (
        <div className="grid gap-3">
          {results.slice(0, 10).map((item, index) => (
            <div
              key={index}
              className="glass rounded-xl p-4 flex items-center gap-4 hover-scale cursor-pointer"
            >
              {item.thumbnails?.[0]?.url && (
                <img
                  src={item.thumbnails[0].url}
                  alt={item.title}
                  className="w-14 h-14 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{item.title}</h3>
                <p className="text-gray-400 text-sm truncate">
                  {item.artists?.map((a) => a.name).join(', ') || item.artist}
                </p>
              </div>
              <button className="p-3 rounded-full bg-purple-600 hover:bg-purple-500 transition-colors">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Charts Component
function ChartsSection({ country }) {
  const { data, isLoading } = useQuery({
    queryKey: ['charts', country],
    queryFn: () => api.charts(country),
  });

  const charts = data?.data?.charts || {};
  const songs = charts.songs?.items || charts.videos?.items || [];

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>🔥</span> Trending Charts
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {songs.slice(0, 5).map((song, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-2xl font-bold text-purple-400 w-8">{index + 1}</span>
              {song.thumbnails?.[0]?.url && (
                <img
                  src={song.thumbnails[0].url}
                  alt={song.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{song.title}</h3>
                <p className="text-gray-400 text-sm truncate">
                  {song.artists?.map((a) => a.name).join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// New Albums Component
function NewAlbumsSection({ country }) {
  const { data, isLoading } = useQuery({
    queryKey: ['new-albums', country],
    queryFn: () => api.newAlbums(country),
  });

  const albums = data?.data?.albums || [];

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>💿</span> New Releases
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {albums.slice(0, 4).map((album, index) => (
            <div
              key={index}
              className="p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              {album.thumbnails?.[0]?.url && (
                <img
                  src={album.thumbnails[0].url}
                  alt={album.title}
                  className="w-full aspect-square rounded-xl object-cover mb-3"
                />
              )}
              <h3 className="text-white font-medium text-sm truncate">{album.title}</h3>
              <p className="text-gray-400 text-xs truncate">
                {album.artists?.map((a) => a.name).join(', ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Country Selector Component
function CountrySelector({ country, setCountry }) {
  const countries = [
    { code: 'US', name: '🇺🇸 USA' },
    { code: 'KR', name: '🇰🇷 Korea' },
    { code: 'JP', name: '🇯🇵 Japan' },
    { code: 'GB', name: '🇬🇧 UK' },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {countries.map((c) => (
        <button
          key={c.code}
          onClick={() => setCountry(c.code)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            country === c.code
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

// Main App
function MusicGramApp() {
  const [country, setCountry] = useState('US');

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">🎵 MusicGram</h1>
          <p className="text-gray-400 mt-1">A Social Platform Connected by Music</p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity">
          Sign In
        </button>
      </header>

      {/* Country Selector */}
      <CountrySelector country={country} setCountry={setCountry} />

      {/* Search */}
      <SearchSection />

      {/* Charts & New Albums */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartsSection country={country} />
        <NewAlbumsSection country={country} />
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>© 2024 MusicGram. Powered by YouTube Music.</p>
      </footer>
    </div>
  );
}

// Root App
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MusicGramApp />
    </QueryClientProvider>
  );
}

export default App;
