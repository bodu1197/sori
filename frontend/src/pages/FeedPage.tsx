import React, { useEffect, useState, useRef, SyntheticEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Play, Repeat2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import useAuthStore from '../stores/useAuthStore';
import {
  LikeButton,
  useLikeCountText,
  InlineComments,
  RepostButton,
  BookmarkButton,
  ShareButton,
  PostOptionsMenu,
  TranslateButton,
  usePostTranslation,
  FollowButton,
} from '../components/social';
import { StoriesBar } from '../components/stories';
import { DEFAULT_AVATAR } from '../components/common';
type FeedFilter = 'following' | 'all';

import {
  type Profile,
  type FeedPost,
  getHighResThumbnail,
  useHomeRecommendations,
  useSuggestedUsers,
} from './FeedPageHelpers';

/**
 * For You Section - Chart-based recommendations (global)
 * Uses country charts for latest popular songs with time-based variety
 */
function ForYouSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { recommendations, countryName, context } = useHomeRecommendations();

  // Handle banner click (Navigate to profile with tracks)
  const handleBannerClick = () => {
    if (recommendations.length === 0) return;

    // Transform to PlaylistTrackData format with ROBUST thumbnails
    const tracksToTransfer = recommendations.map((r) => ({
      videoId: r.videoId,
      title: r.title,
      artist: r.artists?.[0]?.name || r.artist || 'Unknown',
      // Force use YouTube HQ thumbnail to prevent broken images
      thumbnail: r.videoId ? `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg` : r.thumbnail,
      cover: r.videoId ? `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg` : r.thumbnail,
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

  return (
    <div className="px-[5px] py-3 border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={handleBannerClick}
        className="w-full relative overflow-hidden rounded-xl aspect-[3.5/1] sm:aspect-[4/1] group transition-transform active:scale-[0.98]"
      >
        {/* Animated Background Gradient - Darker & Smoother */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>

        {/* Content */}
        <div className="absolute inset-0 p-3 sm:p-5 flex flex-col justify-center text-left">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-0.5 sm:mb-1 drop-shadow-md">
            {context.greeting || t('feed.welcome', 'Welcome back')}
          </h2>

          <p className="text-xs sm:text-sm text-white/90 line-clamp-1 max-w-[70%] sm:max-w-[80%] drop-shadow-sm">
            {context.recommendation?.message || t('feed.findingMusic', 'Discover your daily mix')}{' '}
            {context.temperature !== null && `(${context.temperature}°C)`}
          </p>

          {/* Country badge + Play button (right side) */}
          <div className="absolute right-3 bottom-3 sm:right-5 sm:bottom-5 flex flex-col items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[8px] sm:text-[10px] font-medium text-white/90 uppercase tracking-wider border border-white/10 whitespace-nowrap">
              {countryName ? t('feed.popularIn', { country: countryName }) : t('feed.recommended')}
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:scale-110 transition-all duration-300">
              <Play
                size={18}
                className="text-white group-hover:text-purple-600 ml-0.5 fill-current sm:hidden"
              />
              <Play
                size={20}
                className="text-white group-hover:text-purple-600 ml-1 fill-current hidden sm:block"
              />
            </div>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl"></div>
      </button>
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
  const likeCountText = useLikeCountText(post.like_count || 0);

  // Translation support for caption
  const {
    displayText: displayCaption,
    isTranslated,
    handleTranslated,
    toggleView,
    showOriginal,
  } = usePostTranslation(post.caption || '');

  const handleProfileClick = () => {
    if (profile?.id) {
      navigate(`/profile/${profile.id}`);
    }
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
          <span className="flex items-center gap-1 text-black dark:text-white">
            <MessageCircle size={26} />
            {(post.comment_count || 0) > 0 && (
              <span className="text-sm font-medium">{post.comment_count}</span>
            )}
          </span>
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
          <span className="text-gray-700 dark:text-gray-300">{displayCaption}</span>
        </div>

        {/* Translation controls */}
        {post.caption && post.caption.length >= 5 && (
          <div className="flex items-center gap-2 mt-1">
            {!isTranslated ? (
              <TranslateButton
                postId={post.id}
                text={post.caption}
                onTranslated={handleTranslated}
                size={14}
                showLabel={true}
              />
            ) : (
              <button
                onClick={toggleView}
                className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
              >
                {showOriginal ? t('translate.showTranslated') : t('translate.showOriginal')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-3 mt-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Inline Comments */}
      <InlineComments
        postId={post.id}
        initialCount={post.comment_count || 0}
        onCommentCountChange={(count) => onCommentCountChange?.(post.id, count)}
      />
    </article>
  );
}

/**
 * Suggested Virtual Members Section
 * Shows random artist profiles with Follow buttons
 */

function SuggestedUsersSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { suggestedUsers, loading } = useSuggestedUsers();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 mb-3">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 px-4 overflow-hidden">
          {['sk-suggest-1', 'sk-suggest-2', 'sk-suggest-3', 'sk-suggest-4'].map((id) => (
            <div
              key={id}
              className="flex-shrink-0 w-36 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 animate-pulse"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestedUsers.length === 0) return null;

  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="font-bold text-base text-black dark:text-white">
          {t('feed.suggestedForYou', '회원님을 위한 추천')}
        </h3>
        <button
          onClick={() => navigate('/search')}
          className="text-sm font-semibold text-blue-500 hover:text-blue-600"
        >
          {t('common.seeAll', '모두 보기')}
        </button>
      </div>

      {/* Horizontal Scroll Cards */}
      <div ref={scrollContainerRef} className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
        {suggestedUsers.map((profile) => (
          <div
            key={profile.id}
            className="flex-shrink-0 w-40 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
          >
            {/* Avatar */}
            <button
              onClick={() => navigate(`/profile/${profile.id}`)}
              className="block mx-auto mb-3"
            >
              <img
                src={profile.avatar_url || DEFAULT_AVATAR}
                alt={profile.full_name || profile.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-md"
              />
            </button>

            {/* Name */}
            <button
              onClick={() => navigate(`/profile/${profile.id}`)}
              className="block text-center w-full"
            >
              <p className="font-semibold text-sm text-black dark:text-white truncate">
                {profile.full_name || profile.username}
              </p>
              <p className="text-xs text-gray-500 truncate">@{profile.username}</p>
            </button>

            {/* Followers count */}
            {profile.followers_count !== undefined && profile.followers_count > 0 && (
              <p className="text-xs text-gray-400 text-center mt-1">
                {profile.followers_count.toLocaleString()} {t('common.followers', 'followers')}
              </p>
            )}

            {/* Follow Button */}
            <div className="mt-3">
              <FollowButton userId={profile.id} size="sm" className="w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
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
        const profilesMap = new Map<string, Profile>();
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
          filteredPosts.map((post, index) => (
            <React.Fragment key={post.id}>
              <FeedPostComponent
                post={post}
                onLikeChange={handleLikeChange}
                onCommentCountChange={handleCommentCountChange}
              />
              {/* Insert Suggested Users Section after 5th post */}
              {index === 4 && <SuggestedUsersSection />}
            </React.Fragment>
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
