'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Loader2, Music, User, Disc, ListMusic } from 'lucide-react';
import { api } from '@/lib/api';

interface SearchResult {
  videoId?: string;
  browseId?: string;
  playlistId?: string;
  title?: string;
  name?: string;
  thumbnails?: Array<{ url: string }>;
  artists?: Array<{ name: string; id?: string }>;
  resultType?: string;
}

const filters = [
  { key: '', label: 'All', icon: Search },
  { key: 'songs', label: 'Songs', icon: Music },
  { key: 'artists', label: 'Artists', icon: User },
  { key: 'albums', label: 'Albums', icon: Disc },
  { key: 'playlists', label: 'Playlists', icon: ListMusic },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length > 1) {
      api.getSuggestions(query).then((data) => {
        if (data.success) setSuggestions(data.data || []);
      });
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSuggestions([]);
    const data = await api.search(searchQuery, filter || undefined);
    if (data.success) setResults(data.data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search</h1>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search songs, artists, albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
          className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-10">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <f.icon className="h-4 w-4" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((item, i) => {
            const thumbnail = item.thumbnails?.[0]?.url || '';
            const title = item.title || item.name || '';
            const artistName = item.artists?.map((a) => a.name).join(', ') || item.resultType || '';
            const isArtist = item.resultType === 'artist';
            const href = item.videoId
              ? `/watch/${item.videoId}`
              : item.browseId
              ? isArtist
                ? `/artist/${item.browseId}`
                : `/album/${item.browseId}`
              : item.playlistId
              ? `/album/${item.playlistId}`
              : '#';

            return (
              <Link
                key={i}
                href={href}
                className="flex items-center gap-4 p-3 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className={`w-14 h-14 ${isArtist ? 'rounded-full' : 'rounded'} overflow-hidden bg-zinc-800 flex-shrink-0`}>
                  {thumbnail && (
                    <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{title}</p>
                  <p className="text-sm text-zinc-400 truncate">{artistName}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && query && results.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
