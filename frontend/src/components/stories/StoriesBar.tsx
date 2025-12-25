import { useState, useEffect } from 'react';
import { Plus, Loader2, BadgeCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';
import { DEFAULT_AVATAR } from '../common';

interface Story {
  id: string;
  user_id: string;
  content_type: 'track' | 'playlist' | 'text';
  video_id?: string;
  playlist_id?: string;
  title?: string;
  artist?: string;
  cover_url?: string;
  text_content?: string;
  background_color?: string;
  created_at: string;
  expires_at: string;
}

interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string;
  stories: Story[];
  hasUnviewed: boolean;
  isArtist?: boolean;
}

interface MusicArtistRow {
  browse_id: string;
  name: string;
  thumbnail_url?: string;
  thumbnails?: string;
}

interface StoryWithProfile extends Story {
  profiles?: {
    username?: string;
    avatar_url?: string;
  };
}

export default function StoriesBar() {
  const { user } = useAuthStore();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [artistGroups, setArtistGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myStories, setMyStories] = useState<Story[]>([]);

  useEffect(() => {
    async function fetchStories() {
      try {
        if (user?.id) {
          const { data: myStoriesData } = await supabase
            .from('stories')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: true });
          setMyStories(myStoriesData || []);
        }

        // 2. Get Artists
        const { data: artistsData } = await supabase
          .from('music_artists')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(10);

        const sourceArtists = (artistsData || []) as MusicArtistRow[];

        // Only use real data from DB (no fake/mock data)
        const artists = sourceArtists.map((a: MusicArtistRow) => {
          let avatar = DEFAULT_AVATAR;

          // 1. Check thumbnail_url first (saved by /api/search/quick)
          if (a.thumbnail_url) {
            avatar = a.thumbnail_url;
          } else {
            // 2. Fallback: try parsing thumbnails JSON array
            try {
              const thumbs = JSON.parse(a.thumbnails || '[]');
              if (thumbs.length) {
                // Use index 2, 1, 0 like SearchPage's getBestThumbnail
                avatar = thumbs[2]?.url || thumbs[1]?.url || thumbs[0]?.url || DEFAULT_AVATAR;
              }
            } catch {
              // JSON parse failed, keep DEFAULT_AVATAR
            }
          }

          const fakeStory: Story = {
            id: `artist-story-${a.browse_id}`,
            user_id: a.browse_id,
            content_type: 'text',
            text_content: `Hello! I'm ${a.name}. This is my official AI profile on MusicGram. 🎵`,
            background_color: '#1a1a1a',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          };

          return {
            user_id: a.browse_id,
            username: a.name,
            avatar_url: avatar,
            stories: [fakeStory],
            hasUnviewed: true,
            isArtist: true,
          };
        });

        setArtistGroups(artists.slice(0, 10)); // Show all fallback artists

        if (user?.id) {
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (followingData && followingData.length > 0) {
            const followingIds = followingData.map((f) => f.following_id);
            const { data: storiesData } = await supabase
              .from('stories')
              .select(
                `
                    *,
                    profiles:user_id (
                    username,
                    avatar_url
                    )
                `
              )
              .in('user_id', followingIds)
              .eq('is_active', true)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false });

            const { data: viewedData } = await supabase
              .from('story_views')
              .select('story_id')
              .eq('viewer_id', user.id);

            const viewedSet = new Set((viewedData || []).map((v) => v.story_id));
            setViewedStories(viewedSet);

            const groups: { [key: string]: StoryGroup } = {};
            (storiesData || []).forEach((story: StoryWithProfile) => {
              if (!groups[story.user_id]) {
                groups[story.user_id] = {
                  user_id: story.user_id,
                  username: story.profiles?.username || 'Unknown',
                  avatar_url: story.profiles?.avatar_url || '',
                  stories: [],
                  hasUnviewed: false,
                };
              }
              groups[story.user_id].stories.push(story);
              if (!viewedSet.has(story.id)) {
                groups[story.user_id].hasUnviewed = true;
              }
            });

            setStoryGroups(Object.values(groups));
          }
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStories();
  }, [user?.id]);

  const handleStoryViewed = (storyId: string) => {
    setViewedStories((prev) => new Set(prev).add(storyId));
  };

  const handleStoryCreated = (story: Story) => {
    setMyStories((prev) => [...prev, story]);
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const displayGroups = [...artistGroups, ...storyGroups];
  const hasAnyStories = myStories.length > 0 || displayGroups.length > 0;

  if (!hasAnyStories && !user) return null;

  return (
    <>
      <div className="bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
          {user && (
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                onClick={() =>
                  myStories.length > 0 ? setSelectedGroupIndex(-1) : setShowCreateModal(true)
                }
                className="relative"
              >
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    myStories.length > 0
                      ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-black p-0.5">
                    <img
                      src={user?.user_metadata?.avatar_url || DEFAULT_AVATAR}
                      alt="Your story"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
                {myStories.length === 0 && (
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-black">
                    <Plus size={12} className="text-white" />
                  </div>
                )}
              </button>
              <span className="text-xs mt-1 text-black dark:text-white truncate w-16 text-center">
                Your story
              </span>
            </div>
          )}

          {displayGroups.map((group, index) => {
            const getGradientClass = () => {
              if (group.hasUnviewed) {
                if (group.isArtist) {
                  return 'bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-600 shadow-md shadow-blue-500/30';
                }
                return 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600';
              }
              return 'bg-gray-300 dark:bg-gray-600';
            };

            return (
              <div
                key={group.user_id}
                className="flex flex-col items-center flex-shrink-0 relative"
              >
                <button onClick={() => setSelectedGroupIndex(index)}>
                  <div className={`w-16 h-16 rounded-full p-0.5 ${getGradientClass()}`}>
                    <div className="w-full h-full rounded-full bg-white dark:bg-black p-0.5 relative">
                      <img
                        src={group.avatar_url || DEFAULT_AVATAR}
                        alt={group.username}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== DEFAULT_AVATAR) {
                            target.src = DEFAULT_AVATAR;
                          } else {
                            // If fallback also fails, use a transparent pixel or hide
                            target.onerror = null; // Prevent infinite loop
                            target.src =
                              'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                          }
                        }}
                      />
                    </div>
                  </div>
                </button>

                {/* Artist Name with Verified Badge */}
                <div className="flex items-center gap-0.5 mt-1 max-w-[70px] justify-center">
                  <span className="text-xs text-black dark:text-white truncate text-center">
                    {group.username}
                  </span>
                  {group.isArtist && (
                    <BadgeCheck
                      size={10}
                      className="text-blue-500 flex-shrink-0 ml-0.5"
                      fill="white"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedGroupIndex !== null && (
        <StoryViewer
          groups={
            selectedGroupIndex === -1
              ? [
                  {
                    user_id: user?.id || '',
                    username: 'Your story',
                    avatar_url: user?.user_metadata?.avatar_url || '',
                    stories: myStories,
                    hasUnviewed: false,
                  },
                ]
              : displayGroups
          }
          initialGroupIndex={selectedGroupIndex === -1 ? 0 : selectedGroupIndex}
          onClose={() => setSelectedGroupIndex(null)}
          onStoryViewed={handleStoryViewed}
          viewedStories={viewedStories}
          isOwnStory={selectedGroupIndex === -1}
        />
      )}

      {showCreateModal && (
        <CreateStoryModal
          onClose={() => setShowCreateModal(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}
    </>
  );
}
