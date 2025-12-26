'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useSearch } from '@/hooks/useMusic';
import { SearchFilter, SearchResult } from '@/lib/api/music';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { Search as SearchIcon, Play, Music2, Disc, User, ListMusic } from 'lucide-react';

const FILTER_OPTIONS: { value: SearchFilter | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <SearchIcon className="h-4 w-4" /> },
  { value: 'songs', label: 'Songs', icon: <Music2 className="h-4 w-4" /> },
  { value: 'albums', label: 'Albums', icon: <Disc className="h-4 w-4" /> },
  { value: 'artists', label: 'Artists', icon: <User className="h-4 w-4" /> },
  { value: 'playlists', label: 'Playlists', icon: <ListMusic className="h-4 w-4" /> },
];

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialFilter = (searchParams.get('filter') as SearchFilter) || null;

  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<SearchFilter | 'all'>(initialFilter || 'all');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  const setTrack = usePlayerStore((state) => state.setTrack);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Update URL when search changes
  useEffect(() => {
    if (debouncedQuery) {
      const params = new URLSearchParams();
      params.set('q', debouncedQuery);
      if (activeFilter && activeFilter !== 'all') params.set('filter', activeFilter);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    }
  }, [debouncedQuery, activeFilter, router]);

  const filter = activeFilter === 'all' ? null : activeFilter;
  const { data: results, isLoading, error } = useSearch(debouncedQuery, filter);

  const handlePlayTrack = useCallback((item: SearchResult) => {
    if (item.videoId) {
      setTrack({
        videoId: item.videoId,
        title: item.title,
        artists: item.artists?.map(a => ({ name: a.name, id: a.id || '' })) || [{ name: 'Unknown Artist', id: '' }],
        thumbnail: item.thumbnails?.[0]?.url || '',
        duration: item.duration,
      });
    }
  }, [setTrack]);

  const renderResult = (item: SearchResult, index: number) => {
    const thumbnail = item.thumbnails?.[0]?.url;

    switch (item.resultType) {
      case 'artist':
        return (
          <Link
            key={item.browseId || index}
            href={`/artist/${item.browseId}`}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted shrink-0">
              {thumbnail && (
                <Image src={thumbnail} alt={item.title} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground">Artist</p>
            </div>
          </Link>
        );

      case 'album':
        return (
          <div
            key={item.browseId || index}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
              {thumbnail && (
                <Image src={thumbnail} alt={item.title} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {item.artists?.map(a => a.name).join(', ')} • Album
              </p>
            </div>
          </div>
        );

      case 'playlist':
        return (
          <div
            key={item.browseId || index}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
              {thumbnail && (
                <Image src={thumbnail} alt={item.title} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground">Playlist</p>
            </div>
          </div>
        );

      default: // song or video
        return (
          <div
            key={item.videoId || index}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="relative h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
              {thumbnail && (
                <Image src={thumbnail} alt={item.title} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {item.artists?.map(a => a.name).join(', ')}
                {item.album && ` • ${item.album.name}`}
              </p>
            </div>
            {item.duration && (
              <span className="text-sm text-muted-foreground">{item.duration}</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => handlePlayTrack(item)}
            >
              <Play className="h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search songs, artists, albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-lg"
          autoFocus
        />
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter || 'all'} onValueChange={(v) => setActiveFilter(v as SearchFilter | 'all')}>
        <TabsList>
          {FILTER_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.value || 'all'} value={opt.value || 'all'} className="gap-2">
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Results */}
      <Card>
        <CardContent className="pt-6">
          {!debouncedQuery ? (
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Search for music</p>
              <p className="text-muted-foreground">Find songs, artists, albums, and playlists</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Failed to search: {error.message}</p>
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, index) => renderResult(item, index))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg font-medium">No results found</p>
              <p className="text-muted-foreground">Try a different search term</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
