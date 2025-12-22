import { useState, useEffect } from 'react';
import { Plus, Loader2, BadgeCheck } from 'lucide-react'; // BadgeCheck for verified artists
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
  isArtist?: boolean; // NEW: Flag for artist
}

export default function StoriesBar() {
  const { user } = useAuthStore();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [artistGroups, setArtistGroups] = useState<StoryGroup[]>([]); // NEW
  const [loading, setLoading] = useState(true);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myStories, setMyStories] = useState<Story[]>([]);

  // Fetch stories
  useEffect(() => {
    async function fetchStories() {
      // if (!user?.id) return; // Allow viewing artists even if logged out? Maybe

      try {
        // 1. Get my stories (only if logged in)
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

        // 2. Get Artists (Always fetch)
        const { data: artistsData } = await supabase
          .from('music_artists')
          .select('*')
          .order('last_updated', { ascending: false }) // Recently updated
          .limit(10);

        if (artistsData) {
          const artists = artistsData.map((a: any) => {
            let avatar = DEFAULT_AVATAR;
            try {
              const thumbs = JSON.parse(a.thumbnails || '[]');
              if (thumbs.length) avatar = thumbs[thumbs.length - 1].url;
            } catch (e) {}

            // Create a fake welcome story
            const fakeStory: Story = {
              id: `artist-story-${a.browse_id}`,
              user_id: a.browse_id,
              content_type: 'text',
              text_content: `Hello! I'm ${a.name}. Listen to my latest tracks on MusicGram 🎵`,
              background_color: '#1a1a1a',
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 86400000).toISOString(), // 24h
            };

            return {
              user_id: a.browse_id,
              username: a.name,
              avatar_url: avatar,
              stories: [fakeStory],
              hasUnviewed: true, // Always show as new for engagement
              isArtist: true,
            };
          });
          // Shuffle and pick 5
          setArtistGroups(artists.sort(() => 0.5 - Math.random()).slice(0, 5));
        }

        // 3. Get stories from followed users (only if logged in)
        if (user?.id) {
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (followingData && followingData.length > 0) {
            const followingIds = followingData.map((f) => f.following_id);
            // Get stories
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

            // Get viewed
            const { data: viewedData } = await supabase
              .from('story_views')
              .select('story_id')
              .eq('viewer_id', user.id);

            const viewedSet = new Set((viewedData || []).map((v) => v.story_id));
            setViewedStories(viewedSet);

            // Group
            const groups: { [key: string]: StoryGroup } = {};
            (storiesData || []).forEach((story: any) => {
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

  // Handle story viewed
  const handleStoryViewed = (storyId: string) => {
    setViewedStories((prev) => new Set(prev).add(storyId));
  };

  // Handle story creation success
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

  // Combine: Artists first, then Friends
  const displayGroups = [...artistGroups, ...storyGroups];

  const hasAnyStories = myStories.length > 0 || displayGroups.length > 0;

  if (!hasAnyStories && !user) {
    return null;
  }

  return (
    <>
      <div className="bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
          {/* My Story / Add Story */}
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

          {/* Stories List (Artists + Friends) */}
          {displayGroups.map((group, index) => (
            <div key={group.user_id} className="flex flex-col items-center flex-shrink-0 relative">
              <button onClick={() => setSelectedGroupIndex(index)}>
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    group.hasUnviewed
                      ? group.isArtist
                        ? 'bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-600 shadow-md shadow-blue-500/30' // Artist highlight
                        : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-black p-0.5 relative">
                    <img
                      src={group.avatar_url || DEFAULT_AVATAR}
                      alt={group.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
              </button>

              {/* Artist Name with Verified Badge */}
              <div className="flex items-center gap-0.5 mt-1 max-w-[70px]">
                <span className="text-xs text-black dark:text-white truncate text-center flex-1">
                  {group.username}
                </span>
                {group.isArtist && (
                  <BadgeCheck size={12} className="text-blue-500 flex-shrink-0" fill="white" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Story Viewer Modal */}
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
              : displayGroups // Use displayGroups (Artists + Friends)
          }
          initialGroupIndex={selectedGroupIndex === -1 ? 0 : selectedGroupIndex}
          onClose={() => setSelectedGroupIndex(null)}
          onStoryViewed={handleStoryViewed}
          viewedStories={viewedStories}
          isOwnStory={selectedGroupIndex === -1}
        />
      )}

      {/* Create Story Modal */}
      {showCreateModal && (
        <CreateStoryModal
          onClose={() => setShowCreateModal(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}
    </>
  );
}
