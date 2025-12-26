'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, Play, Music, User, Disc } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<unknown[]>([]);
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
            { icon: Music, label: 'Songs', color: 'from-purple-500 to-pink-500' },
            { icon: User, label: 'Artists', color: 'from-blue-500 to-cyan-500' },
            { icon: Disc, label: 'Albums', color: 'from-orange-500 to-red-500' },
            { icon: Play, label: 'Playlists', color: 'from-green-500 to-teal-500' },
          ].map((cat) => (
            <button
              key={cat.label}
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
            {(results as Array<Record<string, unknown>>).map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer group"
              >
                <div className="relative w-12 h-12 rounded overflow-hidden bg-zinc-800">
                  {(item as { thumbnails?: Array<{ url: string }> }).thumbnails?.[0] && (
                    <Image
                      src={(item as { thumbnails: Array<{ url: string }> }).thumbnails[0].url}
                      alt={(item as { title?: string }).title || 'Result'}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{(item as { title?: string }).title}</p>
                  <p className="text-sm text-zinc-400 truncate">
                    {(item as { artists?: Array<{ name: string }> }).artists?.map((a) => a.name).join(', ') || (item as { resultType?: string }).resultType}
                  </p>
                </div>
                <button className="p-2 rounded-full bg-purple-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-4 w-4" fill="white" />
                </button>
              </div>
            ))}
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
