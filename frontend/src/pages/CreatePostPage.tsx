import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Music, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore from '../stores/usePlayerStore';

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

interface SearchResult {
  videoId: string;
  title: string;
  artists?: Array<{ name: string }>;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  duration?: string;
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setTrack } = usePlayerStore();

  const [step, setStep] = useState<'search' | 'details'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [posting, setPosting] = useState(false);

  // Search for music
  useEffect(() => {
    async function search() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}&filter=songs&limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Get best thumbnail
  const getBestThumbnail = (thumbnails?: Array<{ url: string }>) => {
    if (!thumbnails || thumbnails.length === 0) return null;
    return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
  };

  // Select track and go to details
  const handleSelectTrack = (track: SearchResult) => {
    setSelectedTrack(track);
    setStep('details');
  };

  // Preview track
  const handlePreview = (track: SearchResult) => {
    setTrack({
      videoId: track.videoId,
      title: track.title,
      artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown',
      thumbnail: getBestThumbnail(track.thumbnails) || undefined,
    });
  };

  // Create post
  const handleCreatePost = async () => {
    if (!user?.id || !selectedTrack || posting) return;

    setPosting(true);
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        video_id: selectedTrack.videoId,
        title: selectedTrack.title,
        artist: selectedTrack.artists?.map((a) => a.name).join(', ') || null,
        cover_url: getBestThumbnail(selectedTrack.thumbnails),
        caption: caption || null,
        is_public: isPublic,
      });

      if (error) throw error;

      // Navigate to feed to see the post
      navigate('/');
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setPosting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
        <p className="text-gray-500">Please log in to create a post</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (step === 'details' ? setStep('search') : navigate(-1))}
            className="p-1 text-black dark:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold text-black dark:text-white">
            {step === 'search' ? 'New Post' : 'Share'}
          </h1>
          {step === 'details' ? (
            <button
              onClick={handleCreatePost}
              disabled={posting}
              className="text-blue-500 font-semibold disabled:opacity-50"
            >
              {posting ? <Loader2 size={20} className="animate-spin" /> : 'Share'}
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>
      </div>

      {step === 'search' ? (
        <>
          {/* Search Input */}
          <div className="p-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search for a song..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-3 pl-10 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Search Results */}
          <div className="px-4">
            {searching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-12 text-center">
                <Music size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {searchQuery ? 'No songs found' : 'Search for a song to share'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((track) => (
                  <button
                    type="button"
                    key={track.videoId}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition w-full text-left"
                    onClick={() => handleSelectTrack(track)}
                  >
                    <img
                      src={getBestThumbnail(track.thumbnails) || 'https://via.placeholder.com/60'}
                      alt={track.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-black dark:text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(track);
                      }}
                      className="p-2 text-gray-400 hover:text-black dark:hover:text-white"
                    >
                      <Music size={20} />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Details Step */
        <div className="p-4">
          {/* Selected Track Preview */}
          {selectedTrack && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl mb-6">
              <img
                src={getBestThumbnail(selectedTrack.thumbnails) || 'https://via.placeholder.com/80'}
                alt={selectedTrack.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-black dark:text-white truncate">
                  {selectedTrack.title}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {selectedTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                </p>
                <button
                  onClick={() => handlePreview(selectedTrack)}
                  className="mt-2 text-blue-500 text-sm font-medium"
                >
                  Preview
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedTrack(null);
                  setStep('search');
                }}
                className="p-2 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Caption */}
          <div className="mb-6">
            <label
              htmlFor="caption-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Caption
            </label>
            <textarea
              id="caption-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... (optional)"
              className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-right text-xs text-gray-400 mt-1">{caption.length}/500</p>
          </div>

          {/* Visibility */}
          <div className="mb-6">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Visibility
            </span>
            <div className="space-y-2">
              <button
                onClick={() => setIsPublic(true)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                  isPublic
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="text-black dark:text-white font-medium">Public</span>
                {isPublic && <Check size={20} className="text-blue-500" />}
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                  !isPublic
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="text-black dark:text-white font-medium">Private</span>
                {!isPublic && <Check size={20} className="text-blue-500" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
