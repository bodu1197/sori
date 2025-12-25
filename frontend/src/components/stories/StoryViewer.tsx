import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import usePlayerStore from '../../stores/usePlayerStore';
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
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStoryViewed: (storyId: string) => void;
  viewedStories: Set<string>;
  isOwnStory?: boolean;
}

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
  onStoryViewed,
  viewedStories,
  isOwnStory = false,
}: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { startPlayback, pause } = usePlayerStore();

  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !viewedStories.has(currentStory.id) && !isOwnStory) {
      supabase.rpc('mark_story_viewed', { p_story_id: currentStory.id }).then(() => {});
      onStoryViewed(currentStory.id);
    }
  }, [currentStory, viewedStories, onStoryViewed, isOwnStory]);

  // Play music if story has a track
  useEffect(() => {
    if (currentStory?.video_id && !isPaused && !isMuted) {
      startPlayback(
        [
          {
            videoId: currentStory.video_id,
            title: currentStory.title || 'Unknown',
            artist: currentStory.artist || 'Unknown',
            thumbnail: currentStory.cover_url || '',
          },
        ],
        0
      );
    } else if (isPaused || isMuted) {
      pause();
    }
  }, [currentStory, isPaused, isMuted, startPlayback, pause]);

  // Navigation functions (defined before usage in effects)
  const goToNextStory = () => {
    if (currentStoryIndex < (currentGroup?.stories.length ?? 0) - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  // Progress timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Move to next story - handled by separate effect below
          return 100;
        }
        return prev + 100 / (STORY_DURATION / 100);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle story transition when progress completes
  useEffect(() => {
    if (progress >= 100) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Timer-based story transition requires setState
      goToNextStory();
    }
  }, [
    progress,
    currentStoryIndex,
    currentGroupIndex,
    currentGroup?.stories.length,
    groups.length,
    onClose,
  ]);

  const goToPrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1);
      setCurrentStoryIndex(groups[currentGroupIndex - 1].stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIndex, currentGroupIndex, groups]);

  // Handle click navigation
  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftSide = x < rect.width / 3;
    const isRightSide = x > (rect.width * 2) / 3;

    if (isLeftSide) {
      goToPrevStory();
    } else if (isRightSide) {
      goToNextStory();
    }
  };

  // Handle delete story
  const handleDeleteStory = async () => {
    if (!currentStory || !isOwnStory) return;

    try {
      await supabase.from('stories').delete().eq('id', currentStory.id);
      goToNextStory();
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevStory();
      if (e.key === 'ArrowRight') goToNextStory();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevStory, goToNextStory, onClose]);

  if (!currentStory) return null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1h ago';
    return `${hours}h ago`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2 text-white hover:bg-white/10 rounded-full"
      >
        <X size={28} />
      </button>

      {/* Navigation arrows */}
      {(currentGroupIndex > 0 || currentStoryIndex > 0) && (
        <button
          onClick={goToPrevStory}
          className="absolute left-4 z-20 p-2 text-white hover:bg-white/10 rounded-full"
        >
          <ChevronLeft size={32} />
        </button>
      )}
      {(currentGroupIndex < groups.length - 1 ||
        currentStoryIndex < currentGroup.stories.length - 1) && (
        <button
          onClick={goToNextStory}
          className="absolute right-4 z-20 p-2 text-white hover:bg-white/10 rounded-full"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Story content */}
      <button
        type="button"
        className="relative w-full max-w-md h-full max-h-[85vh] bg-gray-900 rounded-2xl overflow-hidden p-0 border-0"
        onClick={handleClick}
        style={{ backgroundColor: currentStory.background_color || '#000' }}
      >
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
          {currentGroup.stories.map((story, index) => {
            const getProgressWidth = () => {
              if (index < currentStoryIndex) return '100%';
              if (index === currentStoryIndex) return `${progress}%`;
              return '0%';
            };

            return (
              <div key={story.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: getProgressWidth() }}
                />
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentGroup.avatar_url || DEFAULT_AVATAR}
              alt={currentGroup.username}
              className="w-8 h-8 rounded-full object-cover border border-white/20"
            />
            <div>
              <p className="text-white text-sm font-semibold">{currentGroup.username}</p>
              <p className="text-white/60 text-xs">{formatTime(currentStory.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused((prev) => !prev);
              }}
              className="p-1.5 text-white hover:bg-white/10 rounded-full"
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
            {currentStory.video_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                className="p-1.5 text-white hover:bg-white/10 rounded-full"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
            {isOwnStory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStory();
                }}
                className="p-1.5 text-white hover:bg-white/10 rounded-full"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="h-full flex flex-col items-center justify-center px-8">
          {currentStory.content_type === 'track' && (
            <>
              <img
                src={currentStory.cover_url || 'https://via.placeholder.com/300'}
                alt={currentStory.title}
                className="w-48 h-48 rounded-2xl object-cover shadow-2xl mb-6"
              />
              <h2 className="text-white text-xl font-bold text-center mb-2">
                {currentStory.title}
              </h2>
              <p className="text-white/70 text-center">{currentStory.artist}</p>
            </>
          )}

          {currentStory.content_type === 'text' && (
            <p className="text-white text-2xl font-medium text-center leading-relaxed">
              {currentStory.text_content}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}
