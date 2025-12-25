import { Loader2, Music, Search, Type, X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/useAuthStore';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

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

interface SearchResult {
  videoId: string;
  title: string;
  artists?: { name: string }[];
  thumbnails?: { url: string }[];
  duration?: string;
}

interface CreateStoryModalProps {
  readonly onClose: () => void;
  readonly onStoryCreated: (story: Story) => void;
}

const BACKGROUND_COLORS = [
  '#000000',
  '#1a1a2e',
  '#16213e',
  '#0f3460',
  '#533483',
  '#e94560',
  '#ff6b6b',
  '#feca57',
  '#48dbfb',
  '#1dd1a1',
];

export default function CreateStoryModal({ onClose, onStoryCreated }: CreateStoryModalProps) {
  const { user } = useAuthStore();
  const [storyType, setStoryType] = useState<'track' | 'text'>('track');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null);
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search for tracks
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}&filter=songs&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Create story
  const handleCreate = async () => {
    if (!user?.id) {
      setError('Please log in to create a story');
      return;
    }

    if (storyType === 'track' && !selectedTrack) {
      setError('Please select a track');
      return;
    }
    if (storyType === 'text' && !textContent.trim()) {
      setError('Please enter some text');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const storyData = {
        user_id: user.id,
        content_type: storyType,
        video_id: storyType === 'track' ? selectedTrack?.videoId : null,
        title: storyType === 'track' ? selectedTrack?.title : null,
        artist: storyType === 'track' ? selectedTrack?.artists?.[0]?.name : null,
        cover_url:
          storyType === 'track'
            ? selectedTrack?.thumbnails?.[selectedTrack.thumbnails.length - 1]?.url
            : null,
        text_content: storyType === 'text' ? textContent : null,
        background_color: backgroundColor,
      };

      const { data, error: insertError } = await supabase
        .from('stories')
        .insert(storyData)
        .select()
        .single();

      if (insertError) {
        console.error('Supabase error:', insertError);
        setError(insertError.message || 'Failed to create story');
        return;
      }

      onStoryCreated(data as Story);
    } catch (err) {
      console.error('Error creating story:', err);
      setError('An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  };

  const getBestThumbnail = (thumbnails?: { url: string }[]) => {
    if (!thumbnails || thumbnails.length === 0) return 'https://via.placeholder.com/100';
    return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-black dark:text-white">Create Story</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Type Selection */}
        <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setStoryType('track')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition ${
              storyType === 'track'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Music size={18} />
            Music
          </button>
          <button
            onClick={() => setStoryType('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition ${
              storyType === 'text'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Type size={18} />
            Text
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          {storyType === 'track' && (
            <>
              {/* Search */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search for a song..."
                    className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || searchQuery.trim().length < 2}
                  className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {searchLoading ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* Selected Track Preview */}
              {selectedTrack && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={getBestThumbnail(selectedTrack.thumbnails)}
                      alt={selectedTrack.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white truncate">
                        {selectedTrack.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {selectedTrack.artists?.[0]?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTrack(null)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && !selectedTrack && (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.videoId}
                      onClick={() => setSelectedTrack(result)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <img
                        src={getBestThumbnail(result.thumbnails)}
                        alt={result.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-black dark:text-white truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {result.artists?.[0]?.name}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{result.duration}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {storyType === 'text' && (
            <textarea
              placeholder="What's on your mind?"
              className="w-full h-32 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              maxLength={200}
            />
          )}

          {/* Background Color */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500 mb-2">Background Color</p>
            <div className="flex gap-2 flex-wrap">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setBackgroundColor(color)}
                  className={`w-8 h-8 rounded-full transition ${
                    backgroundColor === color
                      ? 'ring-2 ring-offset-2 ring-black dark:ring-white'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={
              creating ||
              (storyType === 'track' && !selectedTrack) ||
              (storyType === 'text' && !textContent.trim())
            }
            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Share to Story'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
