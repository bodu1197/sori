'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Search, Globe, FileVideo, Subtitles, List,
  MessageCircle, Radio, Play, Eye, Clock, ThumbsUp,
  ChevronDown, ChevronUp, ExternalLink, Check, X
} from 'lucide-react';
import { api } from '@/lib/api';

type TabType = 'extract' | 'formats' | 'subtitles' | 'chapters' | 'comments' | 'playlist' | 'live' | 'sites' | 'platforms';

interface ExtractedData {
  id?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  channel?: string;
  channel_id?: string;
  upload_date?: string;
  categories?: string[];
  tags?: string[];
  is_live?: boolean;
  extractor?: string;
  webpage_url?: string;
}

interface FormatData {
  format_id?: string;
  format_note?: string;
  ext?: string;
  resolution?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  tbr?: number;
}

interface SubtitleData {
  subtitles: Record<string, Array<{ ext: string; url: string; name?: string }>>;
  automatic_captions: Record<string, Array<{ ext: string; url: string; name?: string }>>;
  subtitle_count: number;
  auto_caption_count: number;
}

interface ChapterData {
  title?: string;
  start_time?: number;
  end_time?: number;
}

interface CommentData {
  id?: string;
  text?: string;
  author?: string;
  author_thumbnail?: string;
  like_count?: number;
  is_pinned?: boolean;
}

interface SiteData {
  name: string;
  description?: string;
}

interface PlatformItem {
  id?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  url?: string;
}

interface PlatformData {
  user?: {
    id?: string;
    username?: string;
    title?: string;
    thumbnail?: string;
  };
  channel?: {
    name?: string;
    title?: string;
    thumbnail?: string;
  };
  videos?: PlatformItem[];
  posts?: PlatformItem[];
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num?: number): string {
  if (!num) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

export default function YtDlpPage() {
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('extract');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [extractData, setExtractData] = useState<ExtractedData | null>(null);
  const [formatsData, setFormatsData] = useState<FormatData[]>([]);
  const [subtitlesData, setSubtitlesData] = useState<SubtitleData | null>(null);
  const [chaptersData, setChaptersData] = useState<ChapterData[]>([]);
  const [commentsData, setCommentsData] = useState<CommentData[]>([]);
  const [sitesData, setSitesData] = useState<SiteData[]>([]);
  const [sitesCount, setSitesCount] = useState(0);
  const [showAllSites, setShowAllSites] = useState(false);

  // Platform states
  const [platformTab, setPlatformTab] = useState<'tiktok' | 'instagram' | 'twitter' | 'twitch'>('tiktok');
  const [platformUsername, setPlatformUsername] = useState('');
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformData, setPlatformData] = useState<PlatformData | null>(null);

  // Load supported sites on mount
  useEffect(() => {
    const loadSites = async () => {
      const res = await api.ytdlpSupportedSites();
      if (res.success) {
        setSitesData(res.data || []);
        setSitesCount(res.count || 0);
      }
    };
    loadSites();
  }, []);

  const handleExtract = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      let res;
      switch (activeTab) {
        case 'extract':
          res = await api.ytdlpExtract(url);
          if (res.success) setExtractData(res.data);
          else setError(res.error || 'Failed to extract');
          break;
        case 'formats':
          res = await api.ytdlpFormats(url);
          if (res.success) setFormatsData(res.data || []);
          else setError(res.error || 'Failed to get formats');
          break;
        case 'subtitles':
          res = await api.ytdlpSubtitles(url);
          if (res.success) setSubtitlesData(res.data);
          else setError(res.error || 'Failed to get subtitles');
          break;
        case 'chapters':
          res = await api.ytdlpChapters(url);
          if (res.success) setChaptersData(res.data || []);
          else setError(res.error || 'Failed to get chapters');
          break;
        case 'comments':
          res = await api.ytdlpComments(url, 20);
          if (res.success) setCommentsData(res.data || []);
          else setError(res.error || 'Failed to get comments');
          break;
        case 'playlist':
          res = await api.ytdlpPlaylist(url, 50);
          if (res.success) setExtractData(res.data);
          else setError(res.error || 'Failed to get playlist');
          break;
        case 'live':
          res = await api.ytdlpLive(url);
          if (res.success) setExtractData(res.data);
          else setError(res.error || 'Failed to get live info');
          break;
      }
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  };

  const handlePlatformSearch = async () => {
    if (!platformUsername.trim()) return;
    setPlatformLoading(true);
    setPlatformData(null);

    try {
      let res;
      switch (platformTab) {
        case 'tiktok':
          res = await api.tiktokUser(platformUsername);
          break;
        case 'instagram':
          res = await api.instagramUser(platformUsername);
          break;
        case 'twitter':
          res = await api.twitterUser(platformUsername);
          break;
        case 'twitch':
          res = await api.twitchChannel(platformUsername);
          break;
      }
      if (res?.success) setPlatformData(res.data);
    } catch (err) {
      console.error(err);
    }
    setPlatformLoading(false);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'extract', label: 'Metadata', icon: <FileVideo className="h-4 w-4" /> },
    { id: 'formats', label: 'Formats', icon: <List className="h-4 w-4" /> },
    { id: 'subtitles', label: 'Subtitles', icon: <Subtitles className="h-4 w-4" /> },
    { id: 'chapters', label: 'Chapters', icon: <List className="h-4 w-4" /> },
    { id: 'comments', label: 'Comments', icon: <MessageCircle className="h-4 w-4" /> },
    { id: 'playlist', label: 'Playlist', icon: <List className="h-4 w-4" /> },
    { id: 'live', label: 'Live', icon: <Radio className="h-4 w-4" /> },
    { id: 'sites', label: 'Sites', icon: <Globe className="h-4 w-4" /> },
    { id: 'platforms', label: 'Platforms', icon: <Globe className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 p-3 rounded-xl">
          <FileVideo className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">yt-dlp Features</h1>
          <p className="text-zinc-400 text-sm">
            Extract metadata from {sitesCount}+ supported sites
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* URL Input (not shown for sites/platforms tabs) */}
      {activeTab !== 'sites' && activeTab !== 'platforms' && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Enter URL (YouTube, TikTok, Instagram, Twitter, etc.)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              className="w-full pl-10 pr-4 py-3 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={handleExtract}
            disabled={loading || !url.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            Extract
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Extract/Metadata */}
          {activeTab === 'extract' && extractData && (
            <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
              <div className="flex gap-6">
                {extractData.thumbnail && (
                  <img
                    src={extractData.thumbnail}
                    alt={extractData.title || ''}
                    className="w-64 h-36 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{extractData.title}</h2>
                  <p className="text-zinc-400 mt-1">{extractData.channel}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Eye className="h-4 w-4" /> {formatNumber(extractData.view_count)}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <ThumbsUp className="h-4 w-4" /> {formatNumber(extractData.like_count)}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="h-4 w-4" /> {formatDuration(extractData.duration)}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <MessageCircle className="h-4 w-4" /> {formatNumber(extractData.comment_count)}
                    </span>
                  </div>
                  {extractData.is_live && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-red-600 rounded text-xs font-medium">
                      <Radio className="h-3 w-3" /> LIVE
                    </span>
                  )}
                </div>
              </div>

              {extractData.description && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{extractData.description}</p>
                </div>
              )}

              {extractData.tags && extractData.tags.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractData.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <span className="text-zinc-400">Extractor</span>
                  <p className="font-medium">{extractData.extractor || '-'}</p>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <span className="text-zinc-400">Upload Date</span>
                  <p className="font-medium">{extractData.upload_date || '-'}</p>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <span className="text-zinc-400">ID</span>
                  <p className="font-medium truncate">{extractData.id || '-'}</p>
                </div>
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <span className="text-zinc-400">Categories</span>
                  <p className="font-medium">{extractData.categories?.join(', ') || '-'}</p>
                </div>
              </div>

              {extractData.webpage_url && (
                <a
                  href={extractData.webpage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-purple-400 hover:text-purple-300"
                >
                  <ExternalLink className="h-4 w-4" /> Open Original
                </a>
              )}
            </div>
          )}

          {/* Formats */}
          {activeTab === 'formats' && formatsData.length > 0 && (
            <div className="bg-zinc-900 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Format ID</th>
                      <th className="px-4 py-3 text-left">Extension</th>
                      <th className="px-4 py-3 text-left">Resolution</th>
                      <th className="px-4 py-3 text-left">FPS</th>
                      <th className="px-4 py-3 text-left">Video Codec</th>
                      <th className="px-4 py-3 text-left">Audio Codec</th>
                      <th className="px-4 py-3 text-left">Size</th>
                      <th className="px-4 py-3 text-left">Bitrate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formatsData.map((f, i) => (
                      <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                        <td className="px-4 py-3 font-mono">{f.format_id}</td>
                        <td className="px-4 py-3">{f.ext}</td>
                        <td className="px-4 py-3">{f.resolution}</td>
                        <td className="px-4 py-3">{f.fps || '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{f.vcodec !== 'none' ? f.vcodec : '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{f.acodec !== 'none' ? f.acodec : '-'}</td>
                        <td className="px-4 py-3">{formatFileSize(f.filesize)}</td>
                        <td className="px-4 py-3">{f.tbr ? `${f.tbr.toFixed(0)} kbps` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-zinc-800 text-sm text-zinc-400">
                Total: {formatsData.length} formats available
              </div>
            </div>
          )}

          {/* Subtitles */}
          {activeTab === 'subtitles' && subtitlesData && (
            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Subtitles className="h-5 w-5" />
                  Manual Subtitles ({subtitlesData.subtitle_count})
                </h3>
                {Object.keys(subtitlesData.subtitles).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {Object.entries(subtitlesData.subtitles).map(([lang, subs]) => (
                      <div key={lang} className="bg-zinc-800 p-3 rounded-lg">
                        <span className="font-medium">{lang.toUpperCase()}</span>
                        <div className="text-xs text-zinc-400 mt-1">
                          {subs.map(s => s.ext).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500">No manual subtitles available</p>
                )}
              </div>

              <div className="bg-zinc-900 rounded-xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Subtitles className="h-5 w-5" />
                  Auto-generated Captions ({subtitlesData.auto_caption_count})
                </h3>
                {Object.keys(subtitlesData.automatic_captions).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {Object.entries(subtitlesData.automatic_captions).slice(0, 30).map(([lang, caps]) => (
                      <div key={lang} className="bg-zinc-800 p-3 rounded-lg">
                        <span className="font-medium">{lang}</span>
                        <div className="text-xs text-zinc-400 mt-1">
                          {caps.map(c => c.ext).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500">No auto-generated captions available</p>
                )}
              </div>
            </div>
          )}

          {/* Chapters */}
          {activeTab === 'chapters' && (
            <div className="bg-zinc-900 rounded-xl p-6">
              <h3 className="font-bold mb-4">Chapters ({chaptersData.length})</h3>
              {chaptersData.length > 0 ? (
                <div className="space-y-2">
                  {chaptersData.map((ch, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                      <span className="text-zinc-400 font-mono text-sm w-20">
                        {formatDuration(ch.start_time)}
                      </span>
                      <span className="flex-1">{ch.title}</span>
                      <span className="text-zinc-500 text-sm">
                        {formatDuration((ch.end_time || 0) - (ch.start_time || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">No chapters available. Enter a URL and click Extract.</p>
              )}
            </div>
          )}

          {/* Comments */}
          {activeTab === 'comments' && (
            <div className="bg-zinc-900 rounded-xl p-6">
              <h3 className="font-bold mb-4">Comments ({commentsData.length})</h3>
              {commentsData.length > 0 ? (
                <div className="space-y-4">
                  {commentsData.map((c, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-zinc-800 rounded-lg">
                      {c.author_thumbnail ? (
                        <img src={c.author_thumbnail} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-700" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.author}</span>
                          {c.is_pinned && (
                            <span className="text-xs bg-purple-600 px-2 py-0.5 rounded">Pinned</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-300 mt-1">{c.text}</p>
                        {c.like_count !== undefined && (
                          <span className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> {formatNumber(c.like_count)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500">No comments available. Enter a URL and click Extract.</p>
              )}
            </div>
          )}

          {/* Supported Sites */}
          {activeTab === 'sites' && (
            <div className="bg-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Supported Sites ({sitesCount})</h3>
                <button
                  onClick={() => setShowAllSites(!showAllSites)}
                  className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                >
                  {showAllSites ? 'Show Less' : 'Show All'}
                  {showAllSites ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {(showAllSites ? sitesData : sitesData.slice(0, 60)).map((site, i) => (
                  <div key={i} className="px-3 py-2 bg-zinc-800 rounded-lg text-sm truncate" title={site.description || site.name}>
                    {site.name}
                  </div>
                ))}
              </div>
              {!showAllSites && sitesData.length > 60 && (
                <p className="text-center text-zinc-500 text-sm mt-4">
                  And {sitesData.length - 60} more...
                </p>
              )}
            </div>
          )}

          {/* Multi-Platform */}
          {activeTab === 'platforms' && (
            <div className="space-y-6">
              {/* Platform Tabs */}
              <div className="flex gap-2">
                {(['tiktok', 'instagram', 'twitter', 'twitch'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPlatformTab(p); setPlatformData(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      platformTab === p
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              {/* Username Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">@</span>
                  <input
                    type="text"
                    placeholder={`Enter ${platformTab} username`}
                    value={platformUsername}
                    onChange={(e) => setPlatformUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePlatformSearch()}
                    className="w-full pl-8 pr-4 py-3 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handlePlatformSearch}
                  disabled={platformLoading || !platformUsername.trim()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {platformLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* Platform Results */}
              {platformLoading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              )}

              {platformData && !platformLoading && (
                <div className="bg-zinc-900 rounded-xl p-6">
                  <h3 className="font-bold mb-4">
                    {platformTab === 'tiktok' && 'TikTok Videos'}
                    {platformTab === 'instagram' && 'Instagram Posts'}
                    {platformTab === 'twitter' && 'Twitter/X Videos'}
                    {platformTab === 'twitch' && 'Twitch Videos'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(platformData.videos || platformData.posts || []).slice(0, 12).map((item, i) => (
                      <div key={item.id || i} className="group cursor-pointer">
                        <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 relative">
                          {item.thumbnail && (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="h-8 w-8 text-white" fill="white" />
                          </div>
                        </div>
                        <p className="text-sm mt-2 line-clamp-2">{item.title || '-'}</p>
                        {item.view_count !== undefined && item.view_count > 0 && (
                          <p className="text-xs text-zinc-500 mt-1">
                            {formatNumber(item.view_count)} views
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {(!platformData.videos || platformData.videos.length === 0) &&
                   (!platformData.posts || platformData.posts.length === 0) && (
                    <p className="text-zinc-500 text-center py-8">No content found</p>
                  )}
                </div>
              )}

              {/* Feature List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 rounded-xl p-6">
                  <h3 className="font-bold mb-4">TikTok Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> User videos</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Video search</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Trending</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Metadata extraction</li>
                  </ul>
                </div>
                <div className="bg-zinc-900 rounded-xl p-6">
                  <h3 className="font-bold mb-4">Instagram Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> User posts</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Reels</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> IGTV</li>
                    <li className="flex items-center gap-2"><X className="h-4 w-4 text-zinc-500" /> Stories (login required)</li>
                  </ul>
                </div>
                <div className="bg-zinc-900 rounded-xl p-6">
                  <h3 className="font-bold mb-4">Twitter/X Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> User media</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Video tweets</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Spaces (audio)</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Broadcast videos</li>
                  </ul>
                </div>
                <div className="bg-zinc-900 rounded-xl p-6">
                  <h3 className="font-bold mb-4">Twitch Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Channel videos</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Live streams</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> VODs</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Clips</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
