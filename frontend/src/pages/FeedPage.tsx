import { useEffect, useState, SyntheticEvent } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import useContextRecommendation from '../hooks/useContextRecommendation';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

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

interface PlaylistPost {
  id: string;
  title?: string;
  description?: string;
  cover_url?: string;
  video_id?: string;
  created_at: string;
  profiles?: Profile;
}

/**
 * For You Section - Context-based recommendations
 */
function ForYouSection() {
  const context = useContextRecommendation();
  const { startPlayback, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();
  const [recommendations, setRecommendations] = useState<RecommendationTrack[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      if (context.loading || !context.recommendation) return;

      try {
        setLoadingRecs(true);
        const response = await fetch(
          `${API_BASE_URL}/api/search?q=${encodeURIComponent(context.recommendation.searchQuery)}&filter=songs&limit=5`
        );

        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.results || data || []);
        }
      } catch {
        // Failed to fetch recommendations
      } finally {
        setLoadingRecs(false);
      }
    }

    fetchRecommendations();
  }, [context.loading, context.recommendation]);

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
          {context.recommendation?.genre}
        </span>
        <button className="text-xs text-gray-500 hover:text-black dark:hover:text-white">
          See all
        </button>
      </div>

      {/* Horizontal Scroll Recommendations */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
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
            return (
              <div
                key={track.videoId || idx}
                onClick={() => handlePlay(track, idx)}
                className="flex-shrink-0 w-32 cursor-pointer group"
              >
                <div className="relative w-32 h-32 rounded-lg overflow-hidden shadow-md">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
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

interface PlaylistPostProps {
  post: PlaylistPost;
}

function PlaylistPostComponent({ post }: PlaylistPostProps) {
  const user = post.profiles;
  const { setTrack, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();

  const handlePlayClick = () => {
    if (!post.video_id) return;

    // Open popup with the post track
    const panelTrack: PlaylistTrackData = {
      videoId: post.video_id,
      title: post.title || 'Unknown Playlist',
      artists: [{ name: user?.username || 'Unknown Artist' }],
      thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
    };
    openTrackPanel({
      title: post.title || 'Playlist',
      author: { name: user?.username || 'Unknown Artist' },
      thumbnails: post.cover_url ? [{ url: post.cover_url }] : undefined,
      tracks: [panelTrack],
      trackCount: 1,
    });

    const track = {
      videoId: post.video_id,
      title: post.title || 'Unknown Playlist',
      artist: user?.username || 'Unknown Artist',
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
            src={user?.avatar_url || 'https://via.placeholder.com/150'}
            alt={user?.username}
            className="w-8 h-8 rounded-full object-cover border border-gray-100"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none hover:underline text-black dark:text-white">
              {user?.username || 'Unknown'}
            </span>
            {user?.location && (
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-0.5">
                {user.location}
              </span>
            )}
          </div>
        </div>
        <button className="text-gray-500 dark:text-gray-400">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Playlist Visual (16:9 YouTube ratio) */}
      <div
        className="relative w-full aspect-video bg-gray-100 cursor-pointer group overflow-hidden"
        onClick={handlePlayClick}
      >
        <img
          src={
            post.cover_url ||
            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=338&fit=crop'
          }
          alt={post.title}
          className="w-full h-full object-cover"
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

      {/* Action Bar */}
      <div className="flex justify-between items-center px-3 pt-3 pb-2">
        <div className="flex gap-4">
          <button className="hover:opacity-60 text-black dark:text-white">
            <Heart size={26} />
          </button>
          <button className="hover:opacity-60 text-black dark:text-white">
            <MessageCircle size={26} />
          </button>
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
        <span className="font-semibold text-sm text-black dark:text-white">0 likes</span>
      </div>

      {/* Caption */}
      <div className="px-3 pt-1">
        <div className="text-sm">
          <span className="font-semibold mr-2 text-black dark:text-white">{user?.username}</span>
          <span className="text-gray-700 dark:text-gray-300">{post.description}</span>
        </div>
        <button className="text-gray-500 dark:text-gray-400 text-sm mt-1">View comments</button>
      </div>

      {/* Timestamp */}
      <div className="px-3 mt-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<PlaylistPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from('playlists')
          .select(
            `
            *,
            profiles:user_id (
              username,
              avatar_url,
              full_name
            )
          `
          )
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts((data as PlaylistPost[]) || []);
      } catch {
        // Error fetching posts
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) return <div className="p-10 text-center">Loading feed...</div>;

  return (
    <div className="pb-20">
      {/* For You - Context-based Recommendations */}
      <ForYouSection />

      {/* Story Rail */}
      <StoryRail />

      {/* Posts */}
      <div className="space-y-2 mt-2">
        {posts.length > 0 ? (
          posts.map((post) => <PlaylistPostComponent key={post.id} post={post} />)
        ) : (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400">
            <p>No posts yet.</p>
            <p className="text-sm">Follow some musicians or create a playlist!</p>
          </div>
        )}
      </div>
    </div>
  );
}
