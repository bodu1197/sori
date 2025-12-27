'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Play, Eye, ThumbsUp, RefreshCw, Search,
  FileVideo, List, Subtitles, MessageCircle, Radio, Globe,
  ChevronDown, ChevronUp, ExternalLink, Check, X, Clock
} from 'lucide-react';
import { api } from '@/lib/api';

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
  description?: string;
}

interface FormatItem {
  format_id?: string;
  ext?: string;
  resolution?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
}

interface SiteItem {
  name: string;
  description?: string;
}

function formatNumber(num?: number): string {
  if (!num) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// API Section Component
function ApiSection({
  title,
  icon,
  color,
  loading,
  error,
  children,
  onRefresh
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
  error?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <div className={`px-4 py-3 ${color} flex items-center justify-between`}>
        <div className="flex items-center gap-2 font-bold text-white">
          {icon}
          {title}
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="p-1 hover:bg-white/20 rounded">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm py-4">{error}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Video Card Component
function VideoCard({ item, onClick }: { item: VideoItem; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-zinc-800 rounded-lg overflow-hidden hover:bg-zinc-700 transition-colors"
    >
      <div className="aspect-video bg-zinc-700 relative">
        {item.thumbnail && (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="h-8 w-8 text-white" fill="white" />
        </div>
        {item.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 px-1 text-xs rounded">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-sm font-medium line-clamp-2">{item.title || 'Untitled'}</p>
        <p className="text-xs text-zinc-400 mt-1">{item.channel || item.uploader}</p>
        <div className="flex gap-2 text-xs text-zinc-500 mt-1">
          {item.view_count && <span>{formatNumber(item.view_count)} views</span>}
        </div>
      </div>
    </div>
  );
}

export default function YtDlpPage() {
  // Loading states
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Data states
  const [trendingVideos, setTrendingVideos] = useState<VideoItem[]>([]);
  const [trendingShorts, setTrendingShorts] = useState<VideoItem[]>([]);
  const [tiktokVideos, setTiktokVideos] = useState<VideoItem[]>([]);
  const [supportedSites, setSupportedSites] = useState<SiteItem[]>([]);
  const [sitesCount, setSitesCount] = useState(0);
  const [showAllSites, setShowAllSites] = useState(false);

  // URL extraction states
  const [extractUrl, setExtractUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [extractData, setExtractData] = useState<VideoItem | null>(null);
  const [formatsData, setFormatsData] = useState<FormatItem[]>([]);
  const [subtitlesData, setSubtitlesData] = useState<any>(null);

  // Platform search states
  const [tiktokUser, setTiktokUser] = useState('');
  const [tiktokUserVideos, setTiktokUserVideos] = useState<VideoItem[]>([]);
  const [instagramUser, setInstagramUser] = useState('');
  const [instagramPosts, setInstagramPosts] = useState<VideoItem[]>([]);

  const setLoading = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  const setError = (key: string, value: string) => {
    setErrors(prev => ({ ...prev, [key]: value }));
  };

  // Load all data on mount
  useEffect(() => {
    loadTrendingVideos();
    loadTrendingShorts();
    loadTiktokTrending();
    loadSupportedSites();
  }, []);

  const loadTrendingVideos = async () => {
    setLoading('videos', true);
    setError('videos', '');
    const res = await api.getTrendingVideos('US', 8);
    if (res.success) setTrendingVideos(res.data || []);
    else setError('videos', res.error || 'Failed to load');
    setLoading('videos', false);
  };

  const loadTrendingShorts = async () => {
    setLoading('shorts', true);
    setError('shorts', '');
    const res = await api.getTrendingShorts('US', 8);
    if (res.success) setTrendingShorts(res.data || []);
    else setError('shorts', res.error || 'Failed to load');
    setLoading('shorts', false);
  };

  const loadTiktokTrending = async () => {
    setLoading('tiktok', true);
    setError('tiktok', '');
    const res = await api.tiktokTrending(8);
    if (res.success) setTiktokVideos(res.data || []);
    else setError('tiktok', res.error || 'Failed to load');
    setLoading('tiktok', false);
  };

  const loadSupportedSites = async () => {
    setLoading('sites', true);
    const res = await api.ytdlpSupportedSites();
    if (res.success) {
      setSupportedSites(res.data || []);
      setSitesCount(res.count || 0);
    }
    setLoading('sites', false);
  };

  const handleExtract = async () => {
    if (!extractUrl.trim()) return;
    setLoading('extract', true);
    setError('extract', '');
    setExtractData(null);
    setFormatsData([]);
    setSubtitlesData(null);

    const [extractRes, formatsRes, subtitlesRes] = await Promise.all([
      api.ytdlpExtract(extractUrl),
      api.ytdlpFormats(extractUrl),
      api.ytdlpSubtitles(extractUrl)
    ]);

    if (extractRes.success) setExtractData(extractRes.data);
    else setError('extract', extractRes.error || 'Failed to extract');

    if (formatsRes.success) setFormatsData(formatsRes.data || []);
    if (subtitlesRes.success) setSubtitlesData(subtitlesRes.data);

    setLoading('extract', false);
  };

  const handleTiktokUser = async () => {
    if (!tiktokUser.trim()) return;
    setLoading('tiktokUser', true);
    const res = await api.tiktokUser(tiktokUser, 6);
    if (res.success) setTiktokUserVideos(res.data?.videos || []);
    setLoading('tiktokUser', false);
  };

  const handleInstagramUser = async () => {
    if (!instagramUser.trim()) return;
    setLoading('instagramUser', true);
    const res = await api.instagramUser(instagramUser, 6);
    if (res.success) setInstagramPosts(res.data?.posts || []);
    setLoading('instagramUser', false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-purple-600 to-pink-600 rounded-xl p-6">
        <h1 className="text-3xl font-bold">yt-dlp API 대시보드</h1>
        <p className="text-white/80 mt-2">
          {sitesCount.toLocaleString()}개 사이트 지원 • 24개 API 엔드포인트
        </p>
      </div>

      {/* Supported Sites */}
      <ApiSection
        title={`지원 사이트 (${sitesCount.toLocaleString()}개)`}
        icon={<Globe className="h-5 w-5" />}
        color="bg-blue-600"
        loading={loadingStates.sites}
        onRefresh={loadSupportedSites}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {(showAllSites ? supportedSites : supportedSites.slice(0, 48)).map((site, i) => (
            <div key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs truncate" title={site.name}>
              {site.name}
            </div>
          ))}
        </div>
        {supportedSites.length > 48 && (
          <button
            onClick={() => setShowAllSites(!showAllSites)}
            className="mt-3 flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          >
            {showAllSites ? '접기' : `+${supportedSites.length - 48}개 더보기`}
            {showAllSites ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </ApiSection>

      {/* URL Extraction - Core Feature */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-purple-600 flex items-center gap-2 font-bold text-white">
          <FileVideo className="h-5 w-5" />
          URL 메타데이터 추출 (모든 사이트 지원)
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={extractUrl}
              onChange={(e) => setExtractUrl(e.target.value)}
              placeholder="URL 입력 (YouTube, TikTok, Instagram, Twitter 등)"
              className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleExtract}
              disabled={loadingStates.extract}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium disabled:opacity-50"
            >
              {loadingStates.extract ? <Loader2 className="h-5 w-5 animate-spin" /> : '추출'}
            </button>
          </div>

          {errors.extract && (
            <div className="text-red-400 text-sm">{errors.extract}</div>
          )}

          {extractData && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Metadata */}
              <div className="bg-zinc-800 rounded-lg p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <FileVideo className="h-4 w-4" /> 메타데이터
                </h3>
                {extractData.thumbnail && (
                  <img src={extractData.thumbnail} alt="" className="w-full aspect-video object-cover rounded-lg mb-3" />
                )}
                <p className="font-medium">{extractData.title}</p>
                <p className="text-sm text-zinc-400 mt-1">{extractData.channel}</p>
                <div className="flex gap-4 mt-2 text-sm text-zinc-400">
                  <span>{formatNumber(extractData.view_count)} views</span>
                  <span>{formatNumber(extractData.like_count)} likes</span>
                  <span>{formatDuration(extractData.duration)}</span>
                </div>
              </div>

              {/* Formats */}
              <div className="bg-zinc-800 rounded-lg p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <List className="h-4 w-4" /> 포맷 ({formatsData.length}개)
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {formatsData.slice(0, 10).map((f, i) => (
                    <div key={i} className="flex justify-between text-xs bg-zinc-700 px-2 py-1 rounded">
                      <span>{f.format_id} • {f.ext} • {f.resolution || 'audio'}</span>
                      <span>{formatFileSize(f.filesize)}</span>
                    </div>
                  ))}
                  {formatsData.length > 10 && (
                    <p className="text-xs text-zinc-500">+{formatsData.length - 10}개 더...</p>
                  )}
                </div>
              </div>

              {/* Subtitles */}
              {subtitlesData && (
                <div className="bg-zinc-800 rounded-lg p-4 md:col-span-2">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Subtitles className="h-4 w-4" /> 자막
                  </h3>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-sm text-zinc-400">수동 자막:</span>
                      <span className="ml-2 font-medium">{subtitlesData.subtitle_count || 0}개</span>
                    </div>
                    <div>
                      <span className="text-sm text-zinc-400">자동 자막:</span>
                      <span className="ml-2 font-medium">{subtitlesData.auto_caption_count || 0}개</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trending Videos */}
      <ApiSection
        title="YouTube 트렌딩 비디오"
        icon={<Play className="h-5 w-5" />}
        color="bg-red-600"
        loading={loadingStates.videos}
        error={errors.videos}
        onRefresh={loadTrendingVideos}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {trendingVideos.map((v, i) => (
            <VideoCard
              key={v.id || i}
              item={v}
              onClick={() => window.open(`https://youtube.com/watch?v=${v.id}`, '_blank')}
            />
          ))}
        </div>
        {trendingVideos.length === 0 && !loadingStates.videos && (
          <p className="text-zinc-500 text-center py-4">데이터 없음</p>
        )}
      </ApiSection>

      {/* Trending Shorts */}
      <ApiSection
        title="YouTube Shorts 트렌딩"
        icon={<Play className="h-5 w-5" />}
        color="bg-gradient-to-r from-red-500 to-pink-500"
        loading={loadingStates.shorts}
        error={errors.shorts}
        onRefresh={loadTrendingShorts}
      >
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {trendingShorts.map((v, i) => (
            <div
              key={v.id || i}
              onClick={() => window.open(`https://youtube.com/shorts/${v.id}`, '_blank')}
              className="cursor-pointer group"
            >
              <div className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative">
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-8 w-8 text-white" fill="white" />
                </div>
              </div>
              <p className="text-xs mt-1 line-clamp-2">{v.title}</p>
            </div>
          ))}
        </div>
      </ApiSection>

      {/* TikTok Trending */}
      <ApiSection
        title="TikTok 트렌딩"
        icon={<Play className="h-5 w-5" />}
        color="bg-gradient-to-r from-cyan-500 to-pink-500"
        loading={loadingStates.tiktok}
        error={errors.tiktok}
        onRefresh={loadTiktokTrending}
      >
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tiktokVideos.map((v, i) => (
            <div
              key={v.id || i}
              onClick={() => v.url && window.open(v.url, '_blank')}
              className="cursor-pointer group"
            >
              <div className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative">
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-8 w-8 text-white" fill="white" />
                </div>
              </div>
              <p className="text-xs mt-1 line-clamp-2">{v.title}</p>
            </div>
          ))}
        </div>
      </ApiSection>

      {/* TikTok User Search */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 font-bold text-white">
          TikTok 유저 검색
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <span className="flex items-center px-3 bg-zinc-800 rounded-l-lg text-zinc-400">@</span>
            <input
              type="text"
              value={tiktokUser}
              onChange={(e) => setTiktokUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTiktokUser()}
              placeholder="유저명 입력"
              className="flex-1 px-4 py-2 bg-zinc-800 focus:outline-none"
            />
            <button
              onClick={handleTiktokUser}
              disabled={loadingStates.tiktokUser}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-r-lg font-medium disabled:opacity-50"
            >
              {loadingStates.tiktokUser ? <Loader2 className="h-5 w-5 animate-spin" /> : '검색'}
            </button>
          </div>
          {tiktokUserVideos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {tiktokUserVideos.map((v, i) => (
                <div key={i} className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden">
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instagram User Search */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 font-bold text-white">
          Instagram 유저 검색
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <span className="flex items-center px-3 bg-zinc-800 rounded-l-lg text-zinc-400">@</span>
            <input
              type="text"
              value={instagramUser}
              onChange={(e) => setInstagramUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInstagramUser()}
              placeholder="유저명 입력"
              className="flex-1 px-4 py-2 bg-zinc-800 focus:outline-none"
            />
            <button
              onClick={handleInstagramUser}
              disabled={loadingStates.instagramUser}
              className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-r-lg font-medium disabled:opacity-50"
            >
              {loadingStates.instagramUser ? <Loader2 className="h-5 w-5 animate-spin" /> : '검색'}
            </button>
          </div>
          {instagramPosts.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {instagramPosts.map((v, i) => (
                <div key={i} className="aspect-square bg-zinc-800 rounded-lg overflow-hidden">
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API List Summary */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">전체 API 목록</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-bold text-red-400 mb-2">YouTube</h3>
            <ul className="text-sm space-y-1 text-zinc-400">
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 트렌딩 비디오</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 비디오 검색</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 트렌딩 Shorts</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> Shorts 검색</li>
            </ul>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-bold text-purple-400 mb-2">yt-dlp 핵심</h3>
            <ul className="text-sm space-y-1 text-zinc-400">
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 메타데이터 추출</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 포맷 목록</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 자막 추출</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 챕터 정보</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 댓글 추출</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 플레이리스트</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 라이브 스트림</li>
            </ul>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-bold text-pink-400 mb-2">소셜 플랫폼</h3>
            <ul className="text-sm space-y-1 text-zinc-400">
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> TikTok 트렌딩/검색/유저</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> Instagram 포스트/릴스</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> Twitter/X 비디오</li>
              <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> Twitch VOD/라이브</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
