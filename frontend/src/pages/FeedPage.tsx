import React, { useEffect, useState, useRef, SyntheticEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Play, Loader2, Repeat2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import useContextRecommendation from '../hooks/useContextRecommendation';
import useCountry from '../hooks/useCountry';
import useAuthStore from '../stores/useAuthStore';
import {
  LikeButton,
  useLikeCountText,
  CommentsModal,
  RepostButton,
  BookmarkButton,
  ShareButton,
  PostOptionsMenu,
} from '../components/social';
import { StoriesBar } from '../components/stories';
import { DEFAULT_AVATAR } from '../components/common';

type FeedFilter = 'following' | 'all';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

// Country code to name mapping (commonly used countries)
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  KR: 'South Korea',
  JP: 'Japan',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  BR: 'Brazil',
  MX: 'Mexico',
  ES: 'Spain',
  IT: 'Italy',
  IN: 'India',
  ID: 'Indonesia',
  TW: 'Taiwan',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  SG: 'Singapore',
  MY: 'Malaysia',
  NL: 'Netherlands',
  PL: 'Poland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  RU: 'Russia',
  UA: 'Ukraine',
  TR: 'Turkey',
  ZA: 'South Africa',
  EG: 'Egypt',
  SA: 'Saudi Arabia',
  AE: 'UAE',
  IL: 'Israel',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  NG: 'Nigeria',
  KE: 'Kenya',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  NZ: 'New Zealand',
  IE: 'Ireland',
  AT: 'Austria',
  CH: 'Switzerland',
  BE: 'Belgium',
  PT: 'Portugal',
  GR: 'Greece',
  CZ: 'Czechia',
  HU: 'Hungary',
  RO: 'Romania',
};

// Get high resolution YouTube thumbnail (maxresdefault or hqdefault)
const getHighResThumbnail = (videoId?: string, coverUrl?: string): string => {
  // If we have a video ID, use YouTube's max resolution thumbnail
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }

  // If cover_url exists and is a YouTube thumbnail, upgrade to max resolution
  if (coverUrl) {
    const ytMatch = coverUrl.match(/https?:\/\/i\.ytimg\.com\/vi\/([^/]+)\//);
    if (ytMatch) {
      return `https://i.ytimg.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    }
    return coverUrl;
  }

  return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1280&h=720&fit=crop';
};

interface Artist {
  name: string;
  id?: string;
}

interface RecommendationTrack {
  videoId: string;
  title: string;
  artist?: string;
  artists?: Artist[];
  thumbnail?: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
  location?: string;
}

interface FeedPost {
  id: string;
  title: string;
  artist?: string;
  caption?: string;
  cover_url?: string;
  video_id?: string;
  created_at: string;
  like_count?: number;
  comment_count?: number;
  repost_count?: number;
  user_id?: string;
  is_public?: boolean;
  profile?: Profile;
  // Repost info (when this is a repost)
  isRepost?: boolean;
  reposter?: Profile;
  repostQuote?: string;
}

/**
 * For You Section - Chart-based recommendations (global)
 * Uses country charts for latest popular songs with time-based variety
 */
function ForYouSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const context = useContextRecommendation();
  const country = useCountry();
  const { startPlayback, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();
  const [recommendations, setRecommendations] = useState<RecommendationTrack[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [countryName, setCountryName] = useState<string>('');

  // Scroll container ref
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchHomeRecommendations() {
      if (!country.code) return;

      try {
        setLoadingRecs(true);

        // Fetch home recommendations with detected country code
        // Home API returns actual songs, unlike charts which only has playlists/artists
        const response = await fetch(`${API_BASE_URL}/api/home?country=${country.code}`);

        if (response.ok) {
          const data = await response.json();
          // Backend returns: { country, source, sections: [{ title, contents: [...] }] }
          const sections = data.sections || [];

          // Collect all songs from all sections
          const allSongs: Array<{
            videoId: string;
            title: string;
            artists?: Artist[];
            thumbnails?: { url: string }[];
          }> = [];

          for (const section of sections) {
            const contents = section.contents || [];
            for (const item of contents) {
              // Only include items with videoId (actual songs)
              if (item.videoId) {
                allSongs.push({
                  videoId: item.videoId,
                  title: item.title,
                  artists: item.artists,
                  thumbnails: item.thumbnails,
                });
              }
            }
          }

          if (allSongs.length > 0) {
            // Time-based offset for variety (changes every few minutes)
            const now = new Date();
            const seed = now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
            const maxOffset = Math.max(0, allSongs.length - 5);
            const offset = seed % (maxOffset + 1);

            // Select 5 items from offset
            const selected = allSongs.slice(offset, offset + 5);

            // If not enough, wrap around
            const finalSelection =
              selected.length < 5
                ? [...selected, ...allSongs.slice(0, 5 - selected.length)]
                : selected;

            setRecommendations(
              finalSelection.map((item) => ({
                videoId: item.videoId,
                title: item.title,
                artists: item.artists,
                thumbnail: item.thumbnails?.[0]?.url,
              }))
            );
          }

          // Use detected country name
          setCountryName(country.name);
        }
      } catch {
        // Failed to fetch home, fallback to search
        if (context.recommendation?.searchQuery) {
          try {
            const fallbackResponse = await fetch(
              `${API_BASE_URL}/api/search?q=${encodeURIComponent(context.recommendation.searchQuery)}&filter=songs&limit=5`
            );
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setRecommendations(fallbackData.results || fallbackData || []);
            }
          } catch {
            // Both failed
          }
        }
      } finally {
        setLoadingRecs(false);
      }
    }

    fetchHomeRecommendations();
  }, [country.code, country.name, context.recommendation?.searchQuery]);

  // Handle banner click (Navigate to profile with tracks)
  const handleBannerClick = () => {
    if (recommendations.length === 0) return;

    // Transform to PlaylistTrackData format
    const tracksToTransfer = recommendations.map((r) => ({
      videoId: r.videoId,
      title: r.title,
      artist: r.artists?.[0]?.name || r.artist || 'Unknown',
      thumbnail: r.thumbnail,
      cover: r.thumbnail,
    }));

    // Navigate to profile with state
    // We pass the validation to ProfilePage to show these tracks at the top
    navigate(`/profile/${useAuthStore.getState().user?.id}`, {
      state: {
        recommendedTracks: tracksToTransfer,
        contextTitle: context.greeting,
        contextMessage: context.recommendation?.message,
      },
    });
  };

  if (context.loading) {
    return (
      <div className="px-4 py-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
        <div className="flex items-center justify-center py-4">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={handleBannerClick}
        className="w-full relative overflow-hidden rounded-2xl aspect-[3/1] group transition-transform active:scale-[0.98]"
      >
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>

        {/* Content */}
        <div className="absolute inset-0 p-5 flex flex-col justify-center text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{context.recommendation?.emoji || '🎵'}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-medium text-white uppercase tracking-wider border border-white/10">
              {countryName ? t('feed.popularIn', { country: countryName }) : 'Recommended'}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white mb-1 drop-shadow-md">
            {context.greeting}
          </h2>

          <p className="text-sm text-white/90 line-clamp-1 max-w-[80%] drop-shadow-sm">
            {context.recommendation?.message}{' '}
            {context.temperature !== null && `(${context.temperature}°C)`}
          </p>

          {/* Floating Play Icon */}
          <div className="absolute right-5 bottom-5 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
            <Play size={20} className="text-white group-hover:text-purple-600 ml-1 fill-current" />
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl"></div>
      </button>

      {/* Preview of tracks (Mini thumbnails below banner) */}
      <div className="flex gap-2 mt-3 overflow-hidden ml-1">
        {recommendations.slice(0, 5).map((rec, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800 opacity-70"
          >
            <img src={rec.thumbnail} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        <span className="text-xs self-center text-gray-400 ml-1">
          + {recommendations.length} songs
        </span>
      </div>
    </div>
  );
}

function StoryRail() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    async function fetchStories() {
      const { data } = await supabase.from('profiles').select('*').limit(10);
      if (data) setProfiles(data as Profile[]);
    }
    fetchStories();
  }, []);

  if (profiles.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-3 border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
      {profiles.map((profile) => (
        <button
          key={profile.id}
          onClick={() => navigate(`/profile/${profile.id}`)}
          className="flex flex-col items-center flex-shrink-0 cursor-pointer"
        >
          <div
            className={`rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500`}
          >
            <div className="bg-white dark:bg-black p-[2px] rounded-full">
              <img
                src={profile.avatar_url || DEFAULT_AVATAR}
                alt={profile.username}
                className="w-[60px] h-[60px] rounded-full object-cover"
              />
            </div>
          </div>
          <span className="text-xs mt-1 text-gray-800 dark:text-gray-200 truncate w-[64px] text-center">
            {profile.username}
          </span>
        </button>
      ))}
    </div>
  );
}

interface FeedPostProps {
  readonly post: FeedPost;
  readonly onLikeChange?: (postId: string, newCount: number) => void;
  readonly onCommentCountChange?: (postId: string, newCount: number) => void;
}

function FeedPostComponent({ post, onLikeChange, onCommentCountChange }: FeedPostProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = post.profile;
  const displayName = profile?.username || profile?.full_name || 'Unknown';
  const { setTrack, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();
  const { user } = useAuthStore();
  const likeCountText = useLikeCountText(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);

  const handleProfileClick = () => {
    if (profile?.id) {
      navigate(`/profile/${profile.id}`);
    }
  };

  const handleOpenComments = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowComments(true);
  };

  const handlePlayClick = () => {
    if (!post.video_id) return;

    // Open popup with the post track
    const panelTrack: PlaylistTrackData = {
      videoId: post.video_id,
      title: post.title || 'Unknown',
      artists: post.artist ? [{ name: post.artist }] : [{ name: 'Unknown Artist' }],
      thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
    };
    openTrackPanel({
      title: post.title || 'Track',
      author: { name: post.artist || displayName },
      thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
      tracks: [panelTrack],
      trackCount: 1,
    });

    const track = {
      videoId: post.video_id,
      title: post.title || 'Unknown',
      artist: post.artist || 'Unknown Artist',
      thumbnail: post.cover_url,
      cover: post.cover_url,
    };

    setTrack(track);
  };

  const isCurrentlyPlaying = currentTrack?.videoId === post.video_id && isPlaying;

  return (
    <article className="pb-4 border-b border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-3">
        <button onClick={handleProfileClick} className="flex items-center gap-2 cursor-pointer">
          <img
            src={profile?.avatar_url || DEFAULT_AVATAR}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border border-gray-100"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none hover:underline text-black dark:text-white text-left">
              {displayName}
            </span>
          </div>
        </button>
        <PostOptionsMenu postId={post.id} authorId={post.user_id} />
      </div>

      {/* Playlist Visual (16:9 YouTube ratio) */}
      <button
        type="button"
        className="relative w-full aspect-video bg-gray-900 cursor-pointer group overflow-hidden p-0 border-0"
        onClick={handlePlayClick}
      >
        <img
          src={getHighResThumbnail(post.video_id, post.cover_url)}
          alt={post.title}
          width={1280}
          height={720}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            const target = e.currentTarget;
            const currentSrc = target.src;
            // Fallback: maxresdefault -> hqdefault -> sddefault -> placeholder
            if (currentSrc.includes('maxresdefault')) {
              target.src = currentSrc.replace('maxresdefault', 'hqdefault');
            } else if (currentSrc.includes('hqdefault')) {
              target.src = currentSrc.replace('hqdefault', 'sddefault');
            } else {
              target.src =
                'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1280&h=720&fit=crop';
            }
          }}
        />

        {/* Play Overlay */}
        <div
          className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity ${isCurrentlyPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <div
            className={`w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center ${isCurrentlyPlaying ? 'animate-pulse' : ''}`}
          >
            {isCurrentlyPlaying ? (
              <div className="flex gap-1">
                <div
                  className="w-1 h-6 bg-white animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-1 h-6 bg-white animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-1 h-6 bg-white animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            ) : (
              <Play size={28} className="text-white ml-1" fill="white" />
            )}
          </div>
        </div>

        {/* Song Info Tag */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
          <span className="text-xs font-medium text-white">{post.title}</span>
          {post.artist && <span className="text-xs text-gray-300">- {post.artist}</span>}
        </div>
      </button>

      {/* Repost Header (if this is a repost) */}
      {post.isRepost && post.reposter && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <Repeat2 size={16} />
          <span>
            {post.reposter.username} {t('feed.reposted')}
          </span>
        </div>
      )}

      {/* Repost Quote */}
      {post.isRepost && post.repostQuote && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{post.repostQuote}"</p>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-between items-center px-3 pt-3 pb-2">
        <div className="flex gap-4">
          <LikeButton
            postId={post.id}
            initialLikeCount={post.like_count || 0}
            size={26}
            onLikeChange={(_isLiked, count) => {
              onLikeChange?.(post.id, count);
            }}
          />
          <button
            onClick={handleOpenComments}
            className="hover:opacity-60 text-black dark:text-white"
          >
            <MessageCircle size={26} />
          </button>
          <RepostButton postId={post.id} initialCount={post.repost_count || 0} size="md" />
          <ShareButton
            postId={post.video_id || post.id}
            postTitle={post.title}
            postArtist={post.artist}
            postThumbnail={post.cover_url}
            size={26}
          />
        </div>
        <BookmarkButton postId={post.id} size={26} />
      </div>

      {/* Likes */}
      <div className="px-3">
        <span className="font-semibold text-sm text-black dark:text-white">{likeCountText}</span>
      </div>

      {/* Caption */}
      <div className="px-3 pt-1">
        <div className="text-sm">
          <span className="font-semibold mr-2 text-black dark:text-white">{displayName}</span>
          <span className="text-gray-700 dark:text-gray-300">{post.caption}</span>
        </div>
        {(post.comment_count || 0) > 0 ? (
          <button
            onClick={handleOpenComments}
            className="text-gray-500 dark:text-gray-400 text-sm mt-1"
          >
            {t('feed.viewComments', { count: post.comment_count })}
          </button>
        ) : (
          <button
            onClick={handleOpenComments}
            className="text-gray-500 dark:text-gray-400 text-sm mt-1"
          >
            {t('feed.addComment')}
          </button>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-3 mt-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        postId={post.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        onCommentCountChange={(count) => onCommentCountChange?.(post.id, count)}
      />
    </article>
  );
}

export default function FeedPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Fetch list of users the current user follows
  useEffect(() => {
    async function fetchFollowing() {
      if (!user?.id) {
        setFollowingIds([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (error) throw error;
        setFollowingIds(data?.map((f) => f.following_id) || []);
      } catch {
        setFollowingIds([]);
      }
    }
    fetchFollowing();
  }, [user?.id]);

  // Fetch posts from posts table (public feed posts)
  useEffect(() => {
    async function fetchPosts() {
      try {
        // Step 1: Fetch public posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (postsError) throw postsError;

        if (!postsData || postsData.length === 0) {
          setPosts([]);
          return;
        }

        // Step 2: Get unique user IDs
        const userIds = [...new Set(postsData.map((p) => p.user_id).filter(Boolean))];

        // Step 3: Fetch profiles for those user IDs
        let profilesMap = new Map<string, Profile>();
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          } else if (profilesData) {
            profilesData.forEach((p) => profilesMap.set(p.id, p as Profile));
          }
        }

        // Step 4: Combine posts with profiles
        const postsWithProfiles: FeedPost[] = postsData.map((post) => ({
          id: post.id,
          title: post.title,
          artist: post.artist,
          caption: post.caption,
          cover_url: post.cover_url,
          video_id: post.video_id,
          created_at: post.created_at,
          like_count: post.like_count,
          comment_count: post.comment_count,
          repost_count: post.repost_count,
          user_id: post.user_id,
          is_public: post.is_public,
          profile: profilesMap.get(post.user_id) || undefined,
        }));

        setPosts(postsWithProfiles);
      } catch {
        // Error fetching posts
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  // Handle like count update in local state
  const handleLikeChange = useCallback((postId: string, newCount: number) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, like_count: newCount } : post))
    );
  }, []);

  // Handle comment count update in local state
  const handleCommentCountChange = useCallback((postId: string, newCount: number) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, comment_count: newCount } : post))
    );
  }, []);

  // Filter posts based on selected tab
  const filteredPosts =
    filter === 'following' && followingIds.length > 0
      ? posts.filter((post) => post.user_id && followingIds.includes(post.user_id))
      : posts;

  if (loading) return <div className="p-10 text-center">{t('feed.loadingFeed')}</div>;

  return (
    <div className="pb-20">
      {/* For You - Context-based Recommendations */}
      <ForYouSection />

      {/* Feed Filter Tabs */}
      {user && (
        <div className="flex border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-black z-10">
          <button
            onClick={() => setFilter('following')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              filter === 'following'
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('feed.following')}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              filter === 'all'
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('feed.forYou')}
          </button>
        </div>
      )}

      {/* Stories */}
      <StoriesBar />

      {/* Posts */}
      <div className="space-y-2 mt-2">
        {filteredPosts.length > 0 &&
          filteredPosts.map((post) => (
            <FeedPostComponent
              key={post.id}
              post={post}
              onLikeChange={handleLikeChange}
              onCommentCountChange={handleCommentCountChange}
            />
          ))}
        {filteredPosts.length === 0 && filter === 'following' && (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <p>{t('feed.noFollowingPosts')}</p>
            <p className="text-sm mt-1">{t('feed.followHint')}</p>
          </div>
        )}
        {filteredPosts.length === 0 && filter !== 'following' && (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <p>{t('feed.noPosts')}</p>
            <p className="text-sm">{t('feed.createPostHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
