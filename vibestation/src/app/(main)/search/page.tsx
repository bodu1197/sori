'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Music, User, Disc } from 'lucide-react';

interface SearchResult {
  videoId?: string;
  browseId?: string;
  title?: string;
  thumbnails?: Array<{ url: string }>;
  artists?: Array<{ name: string; id?: string }>;
  resultType?: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data || []);
      }
    } catch {
      console.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-zinc-400">Find your favorite music</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search for songs, artists, albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </form>

      {/* Quick Categories */}
      {!query && !results.length && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Music, label: 'Songs', color: 'from-purple-500 to-pink-500', search: 'Top songs 2024' },
            { icon: User, label: 'Artists', color: 'from-blue-500 to-cyan-500', search: 'Popular artists' },
            { icon: Disc, label: 'Albums', color: 'from-orange-500 to-red-500', search: 'New albums 2024' },
            { icon: Search, label: 'Playlists', color: 'from-green-500 to-teal-500', search: 'Top playlists' },
          ].map((cat) => (
            <button
              key={cat.label}
              onClick={() => { setQuery(cat.search); }}
              className={`relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${cat.color} p-4 flex flex-col items-start justify-end hover:scale-105 transition-transform`}
            >
              <cat.icon className="absolute top-4 right-4 h-8 w-8 opacity-50" />
              <span className="font-bold text-lg">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-zinc-400">Searching...</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Results</h2>
          <div className="space-y-2">
            {results.map((item, index) => {
              const artistNames = item.artists?.map(a => a.name).join(', ') || '';
              const thumbnail = item.thumbnails?.[0]?.url || '';
              const isArtist = item.resultType === 'artist' && item.browseId;

              if (isArtist) {
                return (
                  <Link
                    key={item.browseId || index}
                    href={`/artist/${item.browseId}`}
                    className="flex items-center gap-4 p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                      {thumbnail && (
                        <img
                          src={thumbnail}
                          alt={item.title || 'Artist'}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-sm text-zinc-400 truncate">Artist</p>
                    </div>
                    <User className="h-5 w-5 text-zinc-500" />
                  </Link>
                );
              }

              return (
                <div
                  key={item.videoId || index}
                  onClick={() => item.videoId && window.open(`https://music.youtube.com/watch?v=${item.videoId}`, '_blank')}
                  className="flex items-center gap-4 p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-zinc-800">
                    {thumbnail && (
                      <img
                        src={thumbnail}
                        alt={item.title || 'Result'}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-zinc-400 truncate">
                      {artistNames || item.resultType}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {query && !loading && results.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No results found for &quot;{query}&quot;</p>
          <p className="text-sm mt-2">Try different keywords</p>
        </div>
      )}
    </div>
  );
}
