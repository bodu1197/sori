'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Play, Eye, ThumbsUp, RefreshCw, Search,
  FileVideo, List, Subtitles, Globe, X,
  ChevronDown, ChevronUp, Check, Pause, Volume2, VolumeX,
  Maximize, Download
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
  formats?: FormatItem[];
}

interface FormatItem {
  format_id?: string;
  ext?: string;
  resolution?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  url?: string;
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

// Video Player Modal
function VideoPlayerModal({
  video,
  onClose
}: {
  video: VideoItem;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [formats, setFormats] = useState<FormatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadVideoFormats();
  }, [video]);

  const loadVideoFormats = async () => {
    setLoading(true);
    let url = video.url;
    if (!url && video.id) {
      url = `https://www.youtube.com/watch?v=${video.id}`;
    }
    if (url) {
      const res = await api.ytdlpFormats(url);
      if (res.success && res.data) {
        setFormats(res.data);
        // Find best playable format (mp4 with video+audio)
        const playable = res.data.find((f: FormatItem) =>
          f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none' && f.url
        );
        if (playable?.url) {
          setStreamUrl(playable.url);
        }
      }
    }
    setLoading(false);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="font-bold truncate pr-4">{video.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            </div>
          ) : streamUrl ? (
            <>
              <video
                ref={videoRef}
                src={streamUrl}
                className="w-full h-full"
                autoPlay
                muted={isMuted}
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {video.thumbnail && (
                <img src={video.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              )}
              <p className="text-zinc-400 z-10">스트리밍 URL을 가져올 수 없습니다</p>
              <p className="text-zinc-500 text-sm mt-2 z-10">아래에서 포맷을 선택해 다운로드하세요</p>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>{video.channel || video.uploader}</span>
            {video.view_count && <span>{formatNumber(video.view_count)} views</span>}
            {video.like_count && <span>{formatNumber(video.like_count)} likes</span>}
            {video.duration && <span>{formatDuration(video.duration)}</span>}
          </div>
        </div>

        {/* Available Formats */}
        <div className="p-4 max-h-48 overflow-y-auto">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Download className="h-4 w-4" /> 다운로드 가능 포맷 ({formats.length}개)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {formats.slice(0, 12).map((f, i) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between items-center text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded transition-colors"
              >
                <span>{f.resolution || 'audio'} • {f.ext}</span>
                <span className="text-zinc-500">{formatFileSize(f.filesize)}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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

export default function YtDlpPage() {
  const router = useRouter();

  // Modal state
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

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
  const [extractUrl, setExtractUrl] = useState('');
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

    if (extractRes.success) {
      setExtractData(extractRes.data);
    } else {
      setError('extract', extractRes.error || 'Failed to extract');
    }

    if (formatsRes.success) setFormatsData(formatsRes.data || []);
    if (subtitlesRes.success) setSubtitlesData(subtitlesRes.data);

    setLoading('extract', false);
  };

  const handleVideoClick = (video: VideoItem) => {
    // YouTube videos go to watch page
    if (video.id && !video.url?.includes('tiktok') && !video.url?.includes('instagram')) {
      router.push(`/watch/${video.id}`);
    } else {
      // Other platforms open in modal player
      setSelectedVideo(video);
    }
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
      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-purple-600 to-pink-600 rounded-xl p-6">
        <h1 className="text-3xl font-bold">yt-dlp API 대시보드</h1>
        <p className="text-white/80 mt-2">
          {sitesCount.toLocaleString()}개 사이트 지원 • 앱 내 재생 • 다운로드 가능
        </p>
      </div>

      {/* URL Extraction - Core Feature */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-purple-600 flex items-center gap-2 font-bold text-white">
          <FileVideo className="h-5 w-5" />
          URL 메타데이터 추출 & 재생
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={extractUrl}
              onChange={(e) => setExtractUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              placeholder="URL 입력 (YouTube, TikTok, Instagram, Twitter 등 1,862개 사이트)"
              className="flex-1 px-4 py-3 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleExtract}
              disabled={loadingStates.extract}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium disabled:opacity-50"
            >
              {loadingStates.extract ? <Loader2 className="h-5 w-5 animate-spin" /> : '추출'}
            </button>
          </div>

          {errors.extract && (
            <div className="text-red-400 text-sm">{errors.extract}</div>
          )}

          {extractData && (
            <div className="bg-zinc-800 rounded-lg overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Thumbnail with play button */}
                <div
                  className="md:w-80 aspect-video bg-zinc-700 relative cursor-pointer group"
                  onClick={() => setSelectedVideo({ ...extractData, url: extractUrl })}
                >
                  {extractData.thumbnail && (
                    <img src={extractData.thumbnail} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center">
                      <Play className="h-8 w-8 text-white ml-1" fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-purple-600 px-2 py-1 rounded text-xs font-medium">
                    클릭하여 재생
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 p-4">
                  <h3 className="font-bold text-lg">{extractData.title}</h3>
                  <p className="text-zinc-400 mt-1">{extractData.channel}</p>
                  <div className="flex gap-4 mt-3 text-sm text-zinc-400">
                    <span>{formatNumber(extractData.view_count)} views</span>
                    <span>{formatNumber(extractData.like_count)} likes</span>
                    <span>{formatDuration(extractData.duration)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                      {formatsData.length}개 포맷
                    </span>
                    {subtitlesData && (
                      <span className="px-2 py-1 bg-zinc-700 rounded text-xs">
                        {subtitlesData.subtitle_count || 0}개 자막
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Download formats */}
              {formatsData.length > 0 && (
                <div className="border-t border-zinc-700 p-4">
                  <h4 className="font-medium mb-2 text-sm">다운로드 포맷</h4>
                  <div className="flex flex-wrap gap-2">
                    {formatsData.filter(f => f.url).slice(0, 8).map((f, i) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-zinc-700 hover:bg-purple-600 rounded text-xs transition-colors"
                      >
                        {f.resolution || 'audio'} • {f.ext}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
            <div
              key={v.id || i}
              onClick={() => handleVideoClick(v)}
              className="group cursor-pointer bg-zinc-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
            >
              <div className="aspect-video bg-zinc-700 relative">
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                    <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
                  </div>
                </div>
                {v.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 px-1 text-xs rounded">
                    {formatDuration(v.duration)}
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="text-sm font-medium line-clamp-2">{v.title || 'Untitled'}</p>
                <p className="text-xs text-zinc-400 mt-1">{v.channel || v.uploader}</p>
              </div>
            </div>
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
              onClick={() => handleVideoClick({ ...v, url: `https://www.youtube.com/shorts/${v.id}` })}
              className="cursor-pointer group"
            >
              <div className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative hover:ring-2 hover:ring-purple-500 transition-all">
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                    <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                  </div>
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
              onClick={() => setSelectedVideo(v)}
              className="cursor-pointer group"
            >
              <div className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative hover:ring-2 hover:ring-purple-500 transition-all">
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                    <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                  </div>
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
                <div
                  key={i}
                  onClick={() => setSelectedVideo(v)}
                  className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                >
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
                <div
                  key={i}
                  onClick={() => setSelectedVideo(v)}
                  className="aspect-square bg-zinc-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                >
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Summary */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">yt-dlp 기능 요약</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-bold text-purple-400 mb-2">핵심 기능</h3>
            <ul className="space-y-1 text-zinc-400">
              <li>• 1,862개 사이트 메타데이터 추출</li>
              <li>• 모든 포맷 다운로드 지원</li>
              <li>• 자막/챕터/댓글 추출</li>
              <li>• 플레이리스트/라이브 지원</li>
            </ul>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-bold text-red-400 mb-2">YouTube</h3>
            <ul className="space-y-1 text-zinc-400">
              <li>• 트렌딩 비디오/Shorts</li>
              <li>• 검색 및 채널 탐색</li>
              <li>• 앱 내 재생</li>
            </ul>
          </div>
          <div className="bg-zinc-800 p-4 rounded-lg">
            <h3 className="font-bold text-pink-400 mb-2">소셜 플랫폼</h3>
            <ul className="space-y-1 text-zinc-400">
              <li>• TikTok 트렌딩/유저</li>
              <li>• Instagram 포스트/릴스</li>
              <li>• Twitter/X, Twitch</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
