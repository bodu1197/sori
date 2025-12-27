'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Play, Search, TrendingUp, Eye, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface VideoItem {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  channel?: string;
  channel_id?: string;
  description?: string;
  upload_date?: string;
  url?: string;
}

function formatViewCount(count?: number): string {
  if (!count) return '';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'search'>('trending');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    let country = 'US';
    try {
      const geoRes = await fetch('https://ipapi.co/json/');
      const geoData = await geoRes.json();
      country = geoData.country_code || 'US';
    } catch {
      // Fallback to US
    }

    const res = await api.getTrendingVideos(country, 30);
    if (res.success && res.data) {
      setVideos(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setActiveTab('search');
    const res = await api.searchVideos(searchQuery, 30);
    if (res.success && res.data) {
      setVideos(res.data);
    }
    setIsSearching(false);
  };

  const handleTrendingClick = () => {
    setActiveTab('trending');
    setSearchQuery('');
    fetchTrending();
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="bg-gradient-to-r from-red-600 to-red-500 p-2 rounded-lg">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
          Videos
        </h1>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={handleTrendingClick}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'trending'
              ? 'bg-purple-600 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Trending
        </button>
        {activeTab === 'search' && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-zinc-800 text-zinc-300">
            <Search className="h-4 w-4" />
            Results for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Loading indicator for search */}
      {(loading || isSearching) && videos.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      )}

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video, i) => (
          <div
            key={video.id || i}
            onClick={() => setSelectedVideo(video)}
            className="group cursor-pointer"
          >
            <div className="aspect-video rounded-xl overflow-hidden bg-zinc-800 relative">
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                  <Play className="h-8 w-8 text-white" fill="white" />
                </div>
              </div>
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(video.duration)}
                </div>
              )}
            </div>
            <div className="mt-2">
              <p className="font-medium text-sm line-clamp-2">{video.title}</p>
              {video.channel && (
                <p className="text-xs text-zinc-400 mt-1 truncate">{video.channel}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {video.view_count && (
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatViewCount(video.view_count)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && !loading && !isSearching && (
        <div className="text-center py-12 text-zinc-500">
          <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No videos found</p>
          <p className="text-sm mt-2">Try searching for something else</p>
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-zinc-900 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-black relative">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg line-clamp-2">{selectedVideo.title}</h3>
              {selectedVideo.channel && (
                <p className="text-sm text-zinc-400 mt-1">{selectedVideo.channel}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                {selectedVideo.view_count && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {formatViewCount(selectedVideo.view_count)} views
                  </span>
                )}
                {selectedVideo.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(selectedVideo.duration)}
                  </span>
                )}
              </div>
              {selectedVideo.description && (
                <p className="text-sm text-zinc-400 mt-3 line-clamp-3">{selectedVideo.description}</p>
              )}
              <button
                onClick={() => setSelectedVideo(null)}
                className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
