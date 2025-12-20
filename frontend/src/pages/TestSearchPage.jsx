// @ts-nocheck
import React, { useState } from 'react';
import { Search, Play, Heart, Shuffle, Loader2 } from 'lucide-react';
import usePlayerStore from '../stores/usePlayerStore';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

// Placeholder image
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect fill='%23374151' width='120' height='120' rx='60'/%3E%3Ccircle cx='60' cy='45' r='20' fill='%236B7280'/%3E%3Cellipse cx='60' cy='95' rx='35' ry='25' fill='%236B7280'/%3E%3C/svg%3E";

export default function TestSearchPage() {
  const { startPlayback } = usePlayerStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/search/summary?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track) => {
    const playlist = [
      {
        videoId: track.videoId,
        title: track.title,
        artist: track.artists?.[0]?.name || 'Unknown',
        thumbnail: track.thumbnails?.[0]?.url,
      },
    ];
    startPlayback(playlist, 0);
  };

  const artist = data?.artists?.[0];
  const albums = data?.albums2 || [];
  const songs = data?.songs || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-4 pb-32">
      <h1 className="text-2xl font-bold text-center mb-6 text-amber-400">🎵 Test Search Page</h1>

      {/* Search Bar */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search artist..."
          className="flex-1 bg-gray-800 text-white rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Artist Card */}
          {artist && (
            <div className="bg-gray-800/50 rounded-2xl p-6 text-center">
              <div className="w-32 h-32 mx-auto rounded-full overflow-hidden ring-4 ring-amber-500/50 mb-4">
                <img
                  src={artist.thumbnails?.[0]?.url || PLACEHOLDER}
                  alt={artist.artist}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = PLACEHOLDER;
                  }}
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{artist.artist}</h2>
              <p className="text-gray-400 mb-2">{artist.subscribers || 'Artist'}</p>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{artist.description}</p>

              {/* Action Buttons */}
              <div className="flex justify-center gap-3">
                <button className="flex items-center gap-2 bg-amber-500 text-black px-6 py-2 rounded-full font-semibold">
                  <Play size={18} fill="currentColor" /> Play All
                </button>
                <button className="flex items-center gap-2 border border-white/30 px-6 py-2 rounded-full font-semibold">
                  <Shuffle size={18} /> Shuffle
                </button>
                <button className="p-2 text-gray-400 hover:text-red-500">
                  <Heart size={22} />
                </button>
              </div>

              {/* Similar Artists */}
              {artist.related && artist.related.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm text-gray-400 mb-3">Similar Artists</h4>
                  <div className="flex gap-4 justify-center flex-wrap">
                    {artist.related.slice(0, 5).map((r, i) => (
                      <div
                        key={i}
                        className="text-center cursor-pointer"
                        onClick={() => setQuery(r.artist || r.name)}
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-700 mx-auto mb-1">
                          <img
                            src={r.thumbnails?.[0]?.url || PLACEHOLDER}
                            alt={r.artist || r.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs text-gray-400">{r.artist || r.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Songs */}
          {songs.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3 text-amber-400">Top Tracks ({songs.length})</h3>
              <div className="space-y-2">
                {songs.slice(0, 20).map((song, i) => (
                  <div
                    key={song.videoId || i}
                    onClick={() => handlePlayTrack(song)}
                    className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50"
                  >
                    <span className="w-6 text-center text-gray-500">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white truncate">{song.title}</div>
                      <div className="text-sm text-gray-400 truncate">
                        {song.artists?.[0]?.name} {song.album?.name && `• ${song.album.name}`}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{song.duration}</span>
                    <Heart size={16} className="text-gray-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3 text-amber-400">Albums ({albums.length})</h3>
              <div className="grid grid-cols-2 gap-3">
                {albums.slice(0, 10).map((album, i) => (
                  <div
                    key={album.browseId || i}
                    className="bg-gray-800/50 rounded-lg overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-700">
                      <img
                        src={album.thumbnails?.[0]?.url || PLACEHOLDER}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-white truncate">{album.title}</div>
                      <div className="text-sm text-gray-400">
                        {album.year} • {album.type} • {album.tracks?.length || 0} tracks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="mt-8 p-4 bg-gray-900 rounded-lg text-xs">
            <h4 className="text-amber-400 font-bold mb-2">Debug Info</h4>
            <p>Source: {data.source}</p>
            <p>Artists: {data.artists?.length || 0}</p>
            <p>Songs: {data.songs?.length || 0}</p>
            <p>Albums: {data.albums2?.length || 0}</p>
            <p>Related Artists: {artist?.related?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!data && !loading && (
        <div className="text-center py-20 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p>Search for an artist to test the UI</p>
          <p className="text-sm mt-2">Try: BTS, IU, NewJeans, BLACKPINK</p>
        </div>
      )}
    </div>
  );
}
