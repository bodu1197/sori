import { useEffect, useState, useRef, SyntheticEvent, MouseEvent, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Play,
  Loader2,
  Repeat2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import useContextRecommendation from '../hooks/useContextRecommendation';
import useCountry from '../hooks/useCountry';
import useAuthStore from '../stores/useAuthStore';
import { LikeButton, useLikeCountText, CommentsModal, RepostButton } from '../components/social';
import { StoriesBar } from '../components/stories';

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
  const context = useContextRecommendation();
  const country = useCountry();
  const { startPlayback, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();
  const [recommendations, setRecommendations] = useState<RecommendationTrack[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [countryName, setCountryName] = useState<string>('');

  // PC drag scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

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

  const handlePlay = (track: RecommendationTrack, index: number) => {
    // Open popup with all recommendations
    const panelTracks: PlaylistTrackData[] = recommendations.map((r) => ({
      videoId: r.videoId,
      title: r.title,
      artists: r.artists || (r.artist ? [{ name: r.artist }] : [{ name: 'Unknown' }]),
      thumbnails: r.thumbnail ? [{ url: r.thumbnail }] : undefined,
    }));
    openTrackPanel({
      title: context.recommendation?.genre || 'For You',
      author: { name: context.recommendation?.message || '' },
      tracks: panelTracks,
      trackCount: recommendations.length,
    });

    // Start playback
    const tracks = recommendations.map((r) => ({
      videoId: r.videoId,
      title: r.title,
      artist: r.artists?.[0]?.name || r.artist || 'Unknown',
      thumbnail: r.thumbnail,
      cover: r.thumbnail,
    }));
    startPlayback(tracks, index);
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
    <div className="px-4 py-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black border-b border-gray-100 dark:border-gray-800">
      {/* Greeting & Context */}
      <div className="mb-3">
        <h2 className="text-xl font-bold text-black dark:text-white">
          {context.greeting}! {context.recommendation?.emoji}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {context.recommendation?.message}
          {context.temperature !== null && (
            <span className="ml-1 text-gray-400">({context.temperature}°C)</span>
          )}
        </p>
      </div>

      {/* Recommendation Label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {countryName ? `Popular in ${countryName}` : 'For You'}
        </span>
        <button className="text-xs text-gray-500 hover:text-black dark:hover:text-white">
          See all
        </button>
      </div>

      {/* Horizontal Scroll Recommendations */}
      <div
        ref={scrollRef}
        className={`flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {loadingRecs ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-32">
              <div className="w-32 h-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded mt-2 w-24 animate-pulse" />
              <div className="h-2 bg-gray-100 dark:bg-gray-900 rounded mt-1 w-16 animate-pulse" />
            </div>
          ))
        ) : recommendations.length > 0 ? (
          recommendations.map((track, idx) => {
            const isCurrentlyPlaying = currentTrack?.videoId === track.videoId && isPlaying;
            // Use high-res thumbnail from videoId
            const thumbnailUrl = track.videoId
              ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`
              : track.thumbnail;
            return (
              <div
                key={track.videoId || idx}
                onClick={() => !isDragging && handlePlay(track, idx)}
                className="flex-shrink-0 w-32 cursor-pointer group select-none"
              >
                <div className="relative w-32 h-32 rounded-lg overflow-hidden shadow-md bg-gray-800">
                  <img
                    src={thumbnailUrl}
                    alt={track.title}
                    width={320}
                    height={180}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                    }}
                  />
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                      isCurrentlyPlaying
                        ? 'bg-black/40 opacity-100'
                        : 'bg-black/0 opacity-0 group-hover:bg-black/30 group-hover:opacity-100'
                    }`}
                  >
                    {isCurrentlyPlaying ? (
                      <div className="flex gap-0.5">
                        <div
                          className="w-0.5 h-4 bg-white animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <div
                          className="w-0.5 h-4 bg-white animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <div
                          className="w-0.5 h-4 bg-white animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play size={16} className="text-white ml-0.5" fill="white" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium mt-2 truncate text-black dark:text-white">
                  {track.title}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {track.artists?.[0]?.name || track.artist || 'Unknown'}
                </p>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 py-4">No recommendations available</p>
        )}
      </div>
    </div>
  );
}

function StoryRail() {
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
        <div key={profile.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
          <div
            className={`rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500`}
          >
            <div className="bg-white dark:bg-black p-[2px] rounded-full">
              <img
                src={profile.avatar_url || 'https://via.placeholder.com/150'}
                alt={profile.username}
                className="w-[60px] h-[60px] rounded-full object-cover"
              />
            </div>
          </div>
          <span className="text-xs mt-1 text-gray-800 dark:text-gray-200 truncate w-[64px] text-center">
            {profile.username}
          </span>
        </div>
      ))}
    </div>
  );
}

interface FeedPostProps {
  post: FeedPost;
  onLikeChange?: (postId: string, newCount: number) => void;
  onCommentCountChange?: (postId: string, newCount: number) => void;
}

function FeedPostComponent({ post, onLikeChange, onCommentCountChange }: FeedPostProps) {
  const profile = post.profile;
  const displayName = profile?.username || profile?.full_name || 'Unknown';
  const { setTrack, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();
  const likeCountText = useLikeCountText(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);

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
        <div className="flex items-center gap-2 cursor-pointer">
          <img
            src={profile?.avatar_url || 'https://via.placeholder.com/150'}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border border-gray-100"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none hover:underline text-black dark:text-white">
              {displayName}
            </span>
          </div>
        </div>
        <button className="text-gray-500 dark:text-gray-400">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Playlist Visual (16:9 YouTube ratio) */}
      <div
        className="relative w-full aspect-video bg-gray-900 cursor-pointer group overflow-hidden"
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

        {/* Playlist Tag */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
          <span className="text-xs font-medium text-white">{post.title}</span>
        </div>
      </div>

      {/* Repost Header (if this is a repost) */}
      {post.isRepost && post.reposter && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <Repeat2 size={16} />
          <span>{post.reposter.username} reposted</span>
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
            onClick={() => setShowComments(true)}
            className="hover:opacity-60 text-black dark:text-white"
          >
            <MessageCircle size={26} />
          </button>
          <RepostButton postId={post.id} initialCount={post.repost_count || 0} size="md" />
          <button className="hover:opacity-60 text-black dark:text-white">
            <Send size={26} />
          </button>
        </div>
        <button className="hover:opacity-60 text-black dark:text-white">
          <Bookmark size={26} />
        </button>
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
            onClick={() => setShowComments(true)}
            className="text-gray-500 dark:text-gray-400 text-sm mt-1"
          >
            View all {post.comment_count} comments
          </button>
        ) : (
          <button
            onClick={() => setShowComments(true)}
            className="text-gray-500 dark:text-gray-400 text-sm mt-1"
          >
            Add a comment...
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

  if (loading) return <div className="p-10 text-center">Loading feed...</div>;

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
            Following
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              filter === 'all'
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            For You
          </button>
        </div>
      )}

      {/* Stories */}
      <StoriesBar />

      {/* Posts */}
      <div className="space-y-2 mt-2">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <FeedPostComponent
              key={post.id}
              post={post}
              onLikeChange={handleLikeChange}
              onCommentCountChange={handleCommentCountChange}
            />
          ))
        ) : filter === 'following' ? (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <p>No posts from people you follow.</p>
            <p className="text-sm mt-1">Follow some musicians to see their posts here!</p>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <p>No posts yet.</p>
            <p className="text-sm">Follow some musicians or create a post!</p>
          </div>
        )}
      </div>
    </div>
  );
}
