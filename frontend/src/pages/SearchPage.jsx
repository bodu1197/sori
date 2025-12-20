// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
  Search as SearchIcon,
  Play,
  Shuffle,
  Heart,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import usePlayerStore from '../stores/usePlayerStore';
import useAuthStore from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

// Cloud Run Backend API (ytmusicapi)
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

const INITIAL_TRACKS_SHOW = 20;

// Placeholder image as data URL (no external dependency)
const PLACEHOLDER_ARTIST =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect fill='%23374151' width='120' height='120' rx='60'/%3E%3Ccircle cx='60' cy='45' r='20' fill='%236B7280'/%3E%3Cellipse cx='60' cy='95' rx='35' ry='25' fill='%236B7280'/%3E%3C/svg%3E";

// Helper to get best thumbnail URL
const getBestThumbnail = (thumbnails, preferredSize = 120) => {
  if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
    return null;
  }
  const sorted = [...thumbnails].sort((a, b) => {
    const aDiff = Math.abs((a.width || 0) - preferredSize);
    const bDiff = Math.abs((b.width || 0) - preferredSize);
    return aDiff - bDiff;
  });
  return sorted[0]?.url || thumbnails[0]?.url;
};

export default function SearchPage() {
  const { startPlayback, currentTrack, isPlaying } = usePlayerStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData, setSearchData] = useState(null);

  // Processed data
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [allTracks, setAllTracks] = useState([]);

  // UI State
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [likedTracks, setLikedTracks] = useState(new Set());

  const searchInputRef = useRef(null);

  // Search via Cloud Run API
  useEffect(() => {
    if (searchQuery.length > 1) {
      setSearchLoading(true);

      const timer = setTimeout(async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/search/summary?q=${encodeURIComponent(searchQuery)}`
          );

          if (response.ok) {
            const data = await response.json();
            setSearchData(data);
            processSearchData(data);
          } else {
            resetSearchData();
          }
        } catch (error) {
          console.error('Search error:', error);
          resetSearchData();
        } finally {
          setSearchLoading(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      resetSearchData();
    }
  }, [searchQuery]);

  const resetSearchData = () => {
    setSearchData(null);
    setArtists([]);
    setAlbums([]);
    setAllTracks([]);
    setShowAllTracks(false);
  };

  const processSearchData = (data) => {
    // Process artists
    const artistsList = data.artists || [];
    setArtists(artistsList);

    // Process albums
    const albumsList = data.albums2 || [];
    setAlbums(albumsList);

    // Process all tracks
    const tracks = [];
    const seenVideoIds = new Set();

    // 1. Add songs from direct search
    (data.songs || []).forEach((song) => {
      if (song.videoId && !seenVideoIds.has(song.videoId)) {
        seenVideoIds.add(song.videoId);
        tracks.push({
          ...song,
          artist: song.artists?.[0]?.name || 'Unknown Artist',
          album: song.album?.name || '',
          thumbnail: song.thumbnails?.[0]?.url,
        });
      }
    });

    // 2. Process albums2 (artist's complete discography)
    (data.albums2 || []).forEach((item) => {
      if (item.tracks && Array.isArray(item.tracks)) {
        item.tracks.forEach((track) => {
          if (track.videoId && !seenVideoIds.has(track.videoId)) {
            seenVideoIds.add(track.videoId);
            tracks.push({
              ...track,
              album: item.title,
              artist: track.artists?.[0]?.name || item.artists?.[0]?.name || 'Unknown Artist',
              thumbnail: track.thumbnails?.[0]?.url || item.thumbnails?.[0]?.url,
            });
          }
        });
      }
    });

    setAllTracks(tracks);
  };

  // Play handlers
  const handlePlayTrack = (track, index) => {
    const playlist = allTracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      cover: t.thumbnail,
    }));
    startPlayback(playlist, index);
  };

  const handlePlayAllTracks = () => {
    if (allTracks.length === 0) return;
    const playlist = allTracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      cover: t.thumbnail,
    }));
    startPlayback(playlist, 0);
  };

  const handleShuffleAllTracks = () => {
    if (allTracks.length === 0) return;
    const playlist = allTracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      cover: t.thumbnail,
    }));
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Play album tracks
  const handlePlayAlbum = (album) => {
    if (!album.tracks || album.tracks.length === 0) return;
    const playlist = album.tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || album.artists?.[0]?.name || 'Unknown Artist',
      thumbnail: t.thumbnails?.[0]?.url || album.thumbnails?.[0]?.url,
      cover: t.thumbnails?.[0]?.url || album.thumbnails?.[0]?.url,
    }));
    startPlayback(playlist, 0);
  };

  // Add to liked songs
  const handleToggleLike = async (e, track) => {
    e.stopPropagation();
    if (!track.videoId) return;

    const isLiked = likedTracks.has(track.videoId);

    if (isLiked) {
      // Remove from liked
      setLikedTracks((prev) => {
        const next = new Set(prev);
        next.delete(track.videoId);
        return next;
      });
    } else {
      // Add to liked
      setLikedTracks((prev) => new Set(prev).add(track.videoId));

      if (user) {
        try {
          await supabase.from('playlists').insert({
            user_id: user.id,
            title: track.title,
            video_id: track.videoId,
            cover_url: track.thumbnail,
            is_public: true,
          });
        } catch (error) {
          console.error('Error adding to liked:', error);
        }
      }
    }
  };

  const displayedTracks = showAllTracks ? allTracks : allTracks.slice(0, INITIAL_TRACKS_SHOW);

  return (
    <div className="pb-20 min-h-screen bg-white dark:bg-[#0a0a14]">
      {/* Search Bar (Sticky) */}
      <div className="sticky top-0 bg-white dark:bg-[#0a0a14] z-10 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search artists, songs, albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
          />
        </div>
      </div>

      {/* Loading State */}
      {searchLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      )}

      {/* Search Results */}
      {!searchLoading && searchData && (
        <div className="px-4 py-6">
          {/* Artist Card */}
          {artists.length > 0 && (
            <div className="flex flex-col items-center mb-8">
              {/* Artist Image */}
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 mb-3 ring-2 ring-amber-500/30">
                <img
                  src={getBestThumbnail(artists[0].thumbnails, 120) || PLACEHOLDER_ARTIST}
                  alt={artists[0].artist}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = PLACEHOLDER_ARTIST;
                  }}
                />
              </div>

              {/* Artist Name */}
              <h2 className="font-bold text-xl text-black dark:text-white mb-1">
                {artists[0].artist}
              </h2>
              <span className="text-sm text-gray-500 mb-4">Artist</span>

              {/* Action Buttons */}
              {allTracks.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayAllTracks}
                    className="flex items-center gap-2 bg-amber-500 text-black px-6 py-2 rounded-full text-sm font-semibold hover:bg-amber-400 transition"
                  >
                    <Play size={16} fill="currentColor" />
                    Play All
                  </button>
                  <button
                    onClick={handleShuffleAllTracks}
                    className="flex items-center gap-2 border border-gray-600 text-black dark:text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <Shuffle size={16} />
                    Shuffle All
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition">
                    <Heart size={20} />
                  </button>
                </div>
              )}

              {/* Similar Artists */}
              {artists[0]?.related && artists[0].related.length > 0 && (
                <div className="mt-6 w-full">
                  <h4 className="text-sm font-semibold text-gray-500 mb-3 text-center">
                    Similar Artists
                  </h4>
                  <div className="flex gap-4 overflow-x-auto pb-2 justify-center flex-wrap">
                    {artists[0].related.slice(0, 6).map((related, idx) => (
                      <div
                        key={related.browseId || idx}
                        className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                        onClick={() => setSearchQuery(related.artist || related.name)}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 mb-1">
                          <img
                            src={related.thumbnails?.[0]?.url || PLACEHOLDER_ARTIST}
                            alt={related.artist || related.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = PLACEHOLDER_ARTIST;
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 text-center truncate w-16">
                          {related.artist || related.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Tracks Section */}
          {allTracks.length > 0 && (
            <div>
              <h3 className="font-bold text-lg text-black dark:text-white mb-4">
                Top Tracks ({allTracks.length})
              </h3>

              {/* Track List - Clean Design like K-022 */}
              <div className="space-y-1">
                {displayedTracks.map((track, index) => {
                  const isCurrentlyPlaying = currentTrack?.videoId === track.videoId && isPlaying;
                  const isLiked = likedTracks.has(track.videoId);

                  return (
                    <div
                      key={track.videoId || index}
                      onClick={() => handlePlayTrack(track, index)}
                      className={`flex items-center gap-4 py-3 px-2 rounded-lg cursor-pointer transition-colors ${
                        isCurrentlyPlaying
                          ? 'bg-amber-500/10'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      {/* Track Number */}
                      <span className="w-6 text-center text-sm text-gray-500 font-medium">
                        {isCurrentlyPlaying ? (
                          <div className="flex gap-0.5 justify-center">
                            <div
                              className="w-0.5 h-3 bg-amber-500 animate-bounce"
                              style={{ animationDelay: '0ms' }}
                            />
                            <div
                              className="w-0.5 h-3 bg-amber-500 animate-bounce"
                              style={{ animationDelay: '150ms' }}
                            />
                            <div
                              className="w-0.5 h-3 bg-amber-500 animate-bounce"
                              style={{ animationDelay: '300ms' }}
                            />
                          </div>
                        ) : (
                          index + 1
                        )}
                      </span>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm truncate ${
                            isCurrentlyPlaying
                              ? 'font-semibold text-amber-500'
                              : 'text-black dark:text-white'
                          }`}
                        >
                          {track.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {track.artist}
                          {track.album && ` - ${track.album}`}
                        </div>
                      </div>

                      {/* Duration */}
                      {track.duration && (
                        <span className="text-xs text-gray-500 mr-2">{track.duration}</span>
                      )}

                      {/* Like Button */}
                      <button
                        onClick={(e) => handleToggleLike(e, track)}
                        className={`p-1.5 transition-colors ${
                          isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                        }`}
                      >
                        <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Show More / Less Button */}
              {allTracks.length > INITIAL_TRACKS_SHOW && (
                <button
                  onClick={() => setShowAllTracks(!showAllTracks)}
                  className="w-full mt-4 py-2 text-sm font-medium text-amber-500 hover:text-amber-400 flex items-center justify-center gap-1 transition-colors"
                >
                  {showAllTracks ? (
                    <>
                      <ChevronUp size={16} />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Show More ({allTracks.length - INITIAL_TRACKS_SHOW} more)
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Albums Section */}
          {albums.length > 0 && (
            <div className="mt-8">
              <h3 className="font-bold text-lg text-black dark:text-white mb-4">
                Albums ({albums.length})
              </h3>

              {/* Albums Grid - 2 columns */}
              <div className="grid grid-cols-2 gap-3">
                {albums.map((album, index) => (
                  <div
                    key={album.browseId || index}
                    onClick={() => handlePlayAlbum(album)}
                    className="relative bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden cursor-pointer group"
                  >
                    {/* Album Cover */}
                    <div className="aspect-square bg-gray-200 dark:bg-gray-700">
                      <img
                        src={getBestThumbnail(album.thumbnails, 226) || PLACEHOLDER_ARTIST}
                        alt={album.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = PLACEHOLDER_ARTIST;
                        }}
                      />
                    </div>

                    {/* Album Info */}
                    <div className="p-3">
                      <div className="font-medium text-sm text-black dark:text-white truncate">
                        {album.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {album.year && `${album.year} · `}
                        {album.type || 'Album'}
                        {album.tracks && ` · ${album.tracks.length} tracks`}
                      </div>
                    </div>

                    {/* Play indicator on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                        <Play size={24} fill="black" className="text-black ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {allTracks.length === 0 && artists.length === 0 && albums.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!searchLoading && !searchData && (
        <div className="text-center py-20 text-gray-500">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Search for artists, songs, or albums</p>
          <p className="text-sm mt-1">Powered by YouTube Music</p>
        </div>
      )}
    </div>
  );
}
