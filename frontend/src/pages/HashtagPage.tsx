import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Loader2, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import usePlayerStore from '../stores/usePlayerStore';

interface HashtagInfo {
  id: string;
  name: string;
  post_count: number;
}

interface Post {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  video_id: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { startPlayback } = usePlayerStore();

  const [hashtag, setHashtag] = useState<HashtagInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHashtagData() {
      if (!tag) return;

      try {
        // Get hashtag info
        const { data: hashtagData } = await supabase
          .from('hashtags')
          .select('id, name, post_count')
          .eq('name', tag.toLowerCase())
          .single();

        if (hashtagData) {
          setHashtag(hashtagData);

          // Get posts with this hashtag
          const { data: postHashtags } = await supabase
            .from('post_hashtags')
            .select(
              `
              post_id,
              playlists!inner (
                id,
                title,
                description,
                cover_url,
                video_id,
                profiles:user_id (
                  username,
                  avatar_url
                )
              )
            `
            )
            .eq('hashtag_id', hashtagData.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (postHashtags) {
            const formattedPosts = postHashtags.map((ph) => {
              const playlist = ph.playlists as unknown as {
                id: string;
                title: string;
                description: string;
                cover_url: string;
                video_id: string;
                profiles: { username: string; avatar_url: string };
              };
              return {
                id: playlist.id,
                title: playlist.title,
                description: playlist.description,
                cover_url: playlist.cover_url,
                video_id: playlist.video_id,
                user: playlist.profiles,
              };
            });
            setPosts(formattedPosts);
          }
        }
      } catch (error) {
        console.error('Error fetching hashtag:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHashtagData();
  }, [tag]);

  const handlePlayPost = (post: Post) => {
    if (!post.video_id) return;
    startPlayback(
      [
        {
          videoId: post.video_id,
          title: post.title,
          artist: post.user.username,
          thumbnail: post.cover_url,
        },
      ],
      0
    );
  };

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-1 text-black dark:text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Hash size={20} className="text-gray-500" />
            <h1 className="text-lg font-semibold text-black dark:text-white">{tag}</h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : !hashtag ? (
        <div className="py-16 text-center">
          <Hash size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Hashtag not found</p>
        </div>
      ) : (
        <>
          {/* Hashtag Info */}
          <div className="px-4 py-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Hash size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">#{hashtag.name}</h2>
                <p className="text-gray-500">{hashtag.post_count} posts</p>
              </div>
            </div>
          </div>

          {/* Posts Grid */}
          {posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500">No posts with this hashtag yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handlePlayPost(post)}
                  className="relative aspect-square cursor-pointer group"
                >
                  <img
                    src={post.cover_url || 'https://via.placeholder.com/300'}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Play size={32} className="text-white" fill="white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
