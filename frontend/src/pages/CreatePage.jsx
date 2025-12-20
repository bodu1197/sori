// @ts-nocheck
import React from 'react';
import { Camera, Music } from 'lucide-react';

export default function CreatePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-black text-white p-6 text-center">
      <div className="mb-8 p-6 bg-gray-900 rounded-full">
        <Music size={64} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Create a Playlist</h2>
      <p className="text-gray-400 mb-8 max-w-[250px]">
        Share your music taste with the world. Select songs to begin.
      </p>

      <button className="w-full max-w-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition">
        <Music size={20} />
        Select Songs from Library
      </button>

      <button className="w-full max-w-sm bg-transparent border border-gray-700 text-white font-semibold py-3 rounded-lg mt-3 flex items-center justify-center gap-2 hover:bg-white/10 transition">
        <Camera size={20} />
        Upload Cover Art
      </button>
    </div>
  );
}
