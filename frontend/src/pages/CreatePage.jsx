// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2 } from 'lucide-react'; // Import Link icon
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';

export default function CreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [youtubeLink, setYoutubeLink] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_url: '',
    video_id: '',
  });

  // 1. Extract Video ID and Fetch Metadata
  const handleFetchMetadata = async () => {
    if (!youtubeLink) return;
    setFetching(true);

    try {
      // Simple regex to get video ID
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = youtubeLink.match(regExp);
      const videoId = match && match[2].length === 11 ? match[2] : null;

      if (!videoId) {
        alert('Invalid YouTube URL');
        setFetching(false);
        return;
      }

      // Use Noembed for open metadata fetching
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      );
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setFormData({
        title: data.title,
        description: `Released by ${data.author_name}`,
        cover_url:
          data.thumbnail_url_max ||
          data.thumbnail_url ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        video_id: videoId,
      });
    } catch (err) {
      alert('Failed to fetch metadata. Please enter details manually.');
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('You must be logged in.');
    if (!formData.title) return alert('Title is required.');
    if (!formData.video_id) return alert('Video ID is missing. Please use a valid YouTube link.');

    try {
      setLoading(true);
      const { error } = await supabase
        .from('playlists')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            cover_url: formData.cover_url,
            is_public: true,
            video_id: formData.video_id,
          },
        ])
        .select();

      if (error) throw error;

      navigate('/profile');
    } catch (error) {
      alert('Error creating playlist: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-white dark:bg-black text-black dark:text-white pb-20 px-6 pt-6">
      <h2 className="text-2xl font-bold mb-6">Import from YouTube</h2>

      {/* YouTube Link Input Section */}
      <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Paste YouTube Link here..."
            value={youtubeLink}
            onChange={(e) => setYoutubeLink(e.target.value)}
          />
          <button
            onClick={handleFetchMetadata}
            disabled={fetching || !youtubeLink}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {fetching ? <Loader2 className="animate-spin" size={20} /> : <Link2 size={20} />}
            Fetch
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
            Title
          </label>
          <input
            type="text"
            className="w-full bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Parsed title..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
            Description
          </label>
          <textarea
            className="w-full bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="Parsed description..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Preview Section */}
        {formData.cover_url && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
              Preview
            </label>
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-gray-100 relative">
              <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                {/* Play icon decoration */}
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-lg">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-black border-b-[8px] border-b-transparent ml-1"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !formData.video_id}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition ${
            loading || !formData.video_id
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
          }`}
        >
          {loading ? 'Releasing...' : 'Release Music'}
        </button>
      </form>
    </div>
  );
}
