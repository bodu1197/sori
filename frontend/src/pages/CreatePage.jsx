// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuthStore from '../stores/useAuthStore';

export default function CreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_url: '',
    audio_url: '', // Optional for now
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('You must be logged in.');
    if (!formData.title) return alert('Title is required.');

    try {
      setLoading(true);
      const { error } = await supabase
        .from('playlists')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            cover_url:
              formData.cover_url ||
              'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&h=600&fit=crop', // Default placeholder
            is_public: true,
            // audio_url: formData.audio_url // If schema has it
          },
        ])
        .select();

      if (error) throw error;

      // Navigate to profile to see the new post
      navigate('/profile');
    } catch (error) {
      alert('Error creating playlist: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-white dark:bg-black text-black dark:text-white pb-20 px-6 pt-6">
      <h2 className="text-2xl font-bold mb-6">Distribute Music</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
            Title (Song or Album)
          </label>
          <input
            type="text"
            className="w-full bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter title..."
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
            placeholder="Tell us about this release..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
            Cover Image URL
          </label>
          <input
            type="url"
            className="w-full bg-gray-100 dark:bg-gray-900 text-black dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
            value={formData.cover_url}
            onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste a direct image link (e.g. from Unsplash or Imgur).
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition ${
            loading
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
          }`}
        >
          {loading ? 'Distributing...' : 'Release Now'}
        </button>
      </form>
    </div>
  );
}
