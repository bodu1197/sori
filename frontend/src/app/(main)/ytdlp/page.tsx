'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Play, Eye, Clock, ThumbsUp, ExternalLink,
  RefreshCw, Search
} from 'lucide-react';
import { api } from '@/lib/api';
import Image from 'next/image';

type PlatformType = 'youtube' | 'shorts' | 'tiktok';

interface VideoItem {
  id?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  channel?: string;
  uploader?: string;
  url?: string;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num?: number): string {
  if (!num) return '';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function YtDlpPage() {
  const [platform, setPlatform] = useState<PlatformType>('youtube');
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [shorts, setShorts] = useState<VideoItem[]>([]);
  const [tiktoks, setTiktoks] = useState<VideoItem[]>([]);

  // Load all content on mount
  useEffect(() => {
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    setLoading(true);

    const [videosRes, shortsRes, tiktokRes] = await Promise.all([
      api.getTrendingVideos('US', 20),
      api.getTrendingShorts('US', 20),
      api.tiktokTrending(20)
    ]);

    if (videosRes.success) setVideos(videosRes.data || []);
    if (shortsRes.success) setShorts(shortsRes.data || []);
    if (tiktokRes.success) setTiktoks(tiktokRes.data || []);

    setLoading(false);
  };

  const getCurrentContent = (): VideoItem[] => {
    switch (platform) {
      case 'youtube': return videos;
      case 'shorts': return shorts;
      case 'tiktok': return tiktoks;
      default: return [];
    }
  };

  const handleVideoClick = (item: VideoItem) => {
    if (item.url) {
      window.open(item.url, '_blank');
    } else if (item.id) {
      if (platform === 'shorts') {
        window.open(`https://www.youtube.com/shorts/${item.id}`, '_blank');
      } else if (platform === 'youtube') {
        window.open(`https://www.youtube.com/watch?v=${item.id}`, '_blank');
      }
    }
  };

  const content = getCurrentContent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">yt-dlp 콘텐츠</h1>
          <p className="text-zinc-400 mt-1">
            YouTube, Shorts, TikTok 트렌딩 콘텐츠
          </p>
        </div>
        <button
          onClick={loadAllContent}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setPlatform('youtube')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            platform === 'youtube'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          YouTube ({videos.length})
        </button>
        <button
          onClick={() => setPlatform('shorts')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            platform === 'shorts'
              ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.77 10.32l-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25zM10 14.65v-5.3L15 12l-5 2.65z"/>
          </svg>
          Shorts ({shorts.length})
        </button>
        <button
          onClick={() => setPlatform('tiktok')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            platform === 'tiktok'
              ? 'bg-gradient-to-r from-cyan-500 to-pink-500 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
          TikTok ({tiktoks.length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
          <p className="text-zinc-400">콘텐츠 로딩 중...</p>
        </div>
      )}

      {/* Content Grid */}
      {!loading && content.length > 0 && (
        <div className={`grid gap-4 ${
          platform === 'shorts' || platform === 'tiktok'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {content.map((item, i) => (
            <div
              key={item.id || i}
              onClick={() => handleVideoClick(item)}
              className="group cursor-pointer bg-zinc-900 rounded-xl overflow-hidden hover:bg-zinc-800 transition-colors"
            >
              {/* Thumbnail */}
              <div className={`relative ${
                platform === 'shorts' || platform === 'tiktok'
                  ? 'aspect-[9/16]'
                  : 'aspect-video'
              } bg-zinc-800`}>
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt={item.title || ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-6 w-6 text-black ml-1" fill="black" />
                  </div>
                </div>
                {/* Duration badge */}
                {item.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-medium">
                    {formatDuration(item.duration)}
                  </div>
                )}
                {/* Platform badge */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                  platform === 'youtube' ? 'bg-red-600' :
                  platform === 'shorts' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                  'bg-gradient-to-r from-cyan-500 to-pink-500'
                }`}>
                  {platform === 'youtube' ? 'YouTube' : platform === 'shorts' ? 'Shorts' : 'TikTok'}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-medium line-clamp-2 text-sm leading-tight">
                  {item.title || 'Untitled'}
                </h3>
                {(item.channel || item.uploader) && (
                  <p className="text-zinc-400 text-xs mt-1 truncate">
                    {item.channel || item.uploader}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                  {item.view_count !== undefined && item.view_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(item.view_count)}
                    </span>
                  )}
                  {item.like_count !== undefined && item.like_count > 0 && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {formatNumber(item.like_count)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && content.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium mb-2">콘텐츠를 찾을 수 없습니다</h3>
          <p className="text-zinc-400 mb-4">새로고침을 눌러 다시 시도해주세요</p>
          <button
            onClick={loadAllContent}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
          >
            새로고침
          </button>
        </div>
      )}
    </div>
  );
}
