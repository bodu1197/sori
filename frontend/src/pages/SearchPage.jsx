// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
  Search as SearchIcon,
  Play,
  Pause,
  Shuffle,
  Heart,
  ChevronDown,
  ChevronUp,
  Loader2,
  Music,
  Disc3,
  User,
} from 'lucide-react';
import usePlayerStore from '../stores/usePlayerStore';
import useAuthStore from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

// Cloud Run Backend API (ytmusicapi)
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

const INITIAL_TRACKS_SHOW = 10;

export default function SearchPage() {
  const { startPlayback, currentTrack, isPlaying } = usePlayerStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData, setSearchData] = useState(null);

  // Processed data
  const [artists, setArtists] = useState([]);
  const [allTracks, setAllTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [singles, setSingles] = useState([]);

  // UI State
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [expandedAlbums, setExpandedAlbums] = useState({});
  const [activeTab, setActiveTab] = useState('songs'); // 'songs' or 'albums'
  const [relatedArtists, setRelatedArtists] = useState([]);

  const searchInputRef = useRef(null);

  // Comprehensive Music Search via Cloud Run API (ytmusicapi) - Summary endpoint
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
    setAllTracks([]);
    setAlbums([]);
    setSingles([]);
    setRelatedArtists([]);
    setShowAllTracks(false);
    setExpandedAlbums({});
    setActiveTab('songs');
  };

  const processSearchData = (data) => {
    // Process artists
    const artistsList = data.artists || [];
    setArtists(artistsList);

    // Extract related artists from first artist
    if (artistsList.length > 0 && artistsList[0].related) {
      setRelatedArtists(artistsList[0].related);
    } else {
      setRelatedArtists([]);
    }

    // Process all tracks
    const tracks = [];
    const seenVideoIds = new Set();
    const albumsList = [];
    const singlesList = [];

    // 1. Add songs from direct search
    (data.songs || []).forEach((song) => {
      if (song.videoId && !seenVideoIds.has(song.videoId)) {
        seenVideoIds.add(song.videoId);
        tracks.push({
          ...song,
          artist: song.artists?.[0]?.name || 'Unknown Artist',
          thumbnail: song.thumbnails?.[0]?.url,
        });
      }
    });

    // 2. Process albums2 (artist's complete discography)
    (data.albums2 || []).forEach((item) => {
      if (item.tracks && Array.isArray(item.tracks)) {
        // It's an album or single
        const albumTracks = [];
        item.tracks.forEach((track) => {
          if (track.videoId && !seenVideoIds.has(track.videoId)) {
            seenVideoIds.add(track.videoId);
            const processedTrack = {
              ...track,
              album: item.title,
              albumBrowseId: item.browseId,
              albumThumbnail: item.thumbnails?.[0]?.url,
              artist: track.artists?.[0]?.name || item.artists?.[0]?.name || 'Unknown Artist',
              thumbnail: track.thumbnails?.[0]?.url || item.thumbnails?.[0]?.url,
            };
            tracks.push(processedTrack);
            albumTracks.push(processedTrack);
          }
        });

        // Categorize as album or single
        const albumEntry = {
          ...item,
          processedTracks: albumTracks,
        };

        const itemType = (item.type || '').toLowerCase();
        if (itemType.includes('single') || itemType.includes('ep')) {
          singlesList.push(albumEntry);
        } else {
          albumsList.push(albumEntry);
        }
      } else if (item.videoId && !seenVideoIds.has(item.videoId)) {
        // Direct song from artist
        seenVideoIds.add(item.videoId);
        tracks.push({
          ...item,
          artist: item.artists?.[0]?.name || 'Unknown Artist',
          thumbnail: item.thumbnails?.[0]?.url,
        });
      }
    });

    setAllTracks(tracks);
    setAlbums(albumsList);
    setSingles(singlesList);
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

  const handlePlayAlbum = (album) => {
    if (!album.processedTracks || album.processedTracks.length === 0) return;
    const playlist = album.processedTracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail || album.thumbnails?.[0]?.url,
      cover: t.thumbnail || album.thumbnails?.[0]?.url,
    }));
    startPlayback(playlist, 0);
  };

  const handleShuffleAlbum = (album) => {
    if (!album.processedTracks || album.processedTracks.length === 0) return;
    const playlist = album.processedTracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail || album.thumbnails?.[0]?.url,
      cover: t.thumbnail || album.thumbnails?.[0]?.url,
    }));
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Add to liked songs
  const handleAddToLiked = async (track) => {
    if (!track.videoId || !user) return;

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
  };

  const toggleAlbumExpand = (albumId) => {
    setExpandedAlbums((prev) => ({
      ...prev,
      [albumId]: !prev[albumId],
    }));
  };

  const displayedTracks = showAllTracks ? allTracks : allTracks.slice(0, INITIAL_TRACKS_SHOW);

  return (
    <div className="pb-20 min-h-screen bg-white dark:bg-black">
      {/* Search Bar (Sticky) */}
      <div className="sticky top-0 bg-white dark:bg-black z-10 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
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
            className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
          />
        </div>
      </div>

      {/* Loading State */}
      {searchLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Search Results */}
      {!searchLoading && searchData && (
        <div className="px-4 py-4 space-y-6">
          {/* Artist Section */}
          {artists.length > 0 && (
            <section className="space-y-3">
              {artists.map((artist, idx) => (
                <div
                  key={artist.browseId || idx}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4"
                >
                  {/* Artist Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      <img
                        src={artist.thumbnails?.[0]?.url || artist.thumbnails?.[1]?.url}
                        alt={artist.artist}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-lg text-black dark:text-white truncate">
                        {artist.artist}
                      </h2>
                      <span className="text-xs text-gray-500">Artist</span>
                      {artist.subscribers && (
                        <span className="text-xs text-gray-500 ml-2">{artist.subscribers}</span>
                      )}
                    </div>
                  </div>

                  {/* Artist Action Buttons */}
                  {allTracks.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={handlePlayAllTracks}
                        className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-2 rounded-full text-sm font-semibold hover:opacity-80 transition"
                      >
                        <Play size={16} fill="currentColor" />
                        Play All
                      </button>
                      <button
                        onClick={handleShuffleAllTracks}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white py-2 rounded-full text-sm font-semibold hover:opacity-80 transition"
                      >
                        <Shuffle size={16} />
                        Shuffle
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Tabs Section */}
          {(allTracks.length > 0 || albums.length > 0 || singles.length > 0) && (
            <section>
              {/* Tab Buttons */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 mb-4">
                <button
                  onClick={() => setActiveTab('songs')}
                  className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                    activeTab === 'songs'
                      ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Music size={18} />
                    Songs ({allTracks.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                    activeTab === 'albums'
                      ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Disc3 size={18} />
                    Albums ({albums.length + singles.length})
                  </div>
                </button>
              </div>

              {/* Songs Tab Content */}
              {activeTab === 'songs' && allTracks.length > 0 && (
                <div>
                  <div className="space-y-1">
                    {displayedTracks.map((track, index) => {
                      const isCurrentlyPlaying =
                        currentTrack?.videoId === track.videoId && isPlaying;

                      return (
                        <div
                          key={track.videoId || index}
                          onClick={() => handlePlayTrack(track, index)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isCurrentlyPlaying
                              ? 'bg-gray-100 dark:bg-gray-800'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                          }`}
                        >
                          {/* Track Number */}
                          <span className="w-6 text-center text-sm text-gray-500 font-medium">
                            {isCurrentlyPlaying ? (
                              <div className="flex gap-0.5 justify-center">
                                <div
                                  className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                                  style={{ animationDelay: '0ms' }}
                                />
                                <div
                                  className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                                  style={{ animationDelay: '150ms' }}
                                />
                                <div
                                  className="w-0.5 h-3 bg-black dark:bg-white animate-bounce"
                                  style={{ animationDelay: '300ms' }}
                                />
                              </div>
                            ) : (
                              index + 1
                            )}
                          </span>

                          {/* Thumbnail */}
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full rounded object-cover bg-gray-200"
                              onError={(e) => {
                                e.target.src =
                                  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                              }}
                            />
                          </div>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm truncate ${isCurrentlyPlaying ? 'font-semibold text-black dark:text-white' : 'text-black dark:text-white'}`}
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
                            <span className="text-xs text-gray-500">{track.duration}</span>
                          )}

                          {/* Like Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToLiked(track);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Heart size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show More / Less Button */}
                  {allTracks.length > INITIAL_TRACKS_SHOW && (
                    <button
                      onClick={() => setShowAllTracks(!showAllTracks)}
                      className="w-full mt-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white flex items-center justify-center gap-1 transition-colors"
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

              {/* Albums Tab Content */}
              {activeTab === 'albums' && (
                <div className="space-y-4">
                  {/* Albums */}
                  {albums.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Albums
                      </h4>
                      {albums.map((album, idx) => {
                        const albumKey = album.browseId || `album-${idx}`;
                        const isExpanded = expandedAlbums[albumKey];

                        return (
                          <div
                            key={albumKey}
                            className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden"
                          >
                            {/* Album Header */}
                            <div className="flex items-center gap-3 p-3">
                              <img
                                src={album.thumbnails?.[0]?.url}
                                alt={album.title}
                                className="w-16 h-16 rounded object-cover bg-gray-200"
                                onError={(e) => {
                                  e.target.src =
                                    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-black dark:text-white truncate">
                                  {album.title}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {album.type} {album.year && `· ${album.year}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {album.processedTracks?.length || 0} tracks
                                </div>
                              </div>
                            </div>

                            {/* Album Actions */}
                            <div className="flex gap-2 px-3 pb-3">
                              <button
                                onClick={() => handlePlayAlbum(album)}
                                className="flex-1 flex items-center justify-center gap-1 bg-black dark:bg-white text-white dark:text-black py-1.5 rounded-full text-xs font-semibold hover:opacity-80 transition"
                              >
                                <Play size={12} fill="currentColor" />
                                Play
                              </button>
                              <button
                                onClick={() => handleShuffleAlbum(album)}
                                className="flex-1 flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white py-1.5 rounded-full text-xs font-semibold hover:opacity-80 transition"
                              >
                                <Shuffle size={12} />
                                Shuffle
                              </button>
                              {album.processedTracks?.length > 0 && (
                                <button
                                  onClick={() => toggleAlbumExpand(albumKey)}
                                  className="flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-80 transition"
                                >
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  All
                                </button>
                              )}
                            </div>

                            {/* Album Tracks (Expandable) */}
                            {isExpanded && album.processedTracks?.length > 0 && (
                              <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2">
                                {album.processedTracks.map((track, tIdx) => {
                                  const isCurrentlyPlaying =
                                    currentTrack?.videoId === track.videoId && isPlaying;

                                  return (
                                    <div
                                      key={track.videoId || tIdx}
                                      onClick={() => {
                                        const playlist = album.processedTracks.map((t) => ({
                                          videoId: t.videoId,
                                          title: t.title,
                                          artist: t.artist,
                                          thumbnail: t.thumbnail || album.thumbnails?.[0]?.url,
                                          cover: t.thumbnail || album.thumbnails?.[0]?.url,
                                        }));
                                        startPlayback(playlist, tIdx);
                                      }}
                                      className={`flex items-center gap-2 py-2 cursor-pointer rounded ${
                                        isCurrentlyPlaying
                                          ? 'bg-gray-100 dark:bg-gray-800'
                                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                      }`}
                                    >
                                      <span className="w-5 text-center text-xs text-gray-500">
                                        {tIdx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div
                                          className={`text-sm truncate ${isCurrentlyPlaying ? 'font-semibold' : ''} text-black dark:text-white`}
                                        >
                                          {track.title}
                                        </div>
                                      </div>
                                      {track.duration && (
                                        <span className="text-xs text-gray-500">
                                          {track.duration}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Singles & EPs */}
                  {singles.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Singles & EPs
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {singles.map((single, idx) => {
                          const singleKey = single.browseId || `single-${idx}`;

                          return (
                            <div
                              key={singleKey}
                              onClick={() => handlePlayAlbum(single)}
                              className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition"
                            >
                              <img
                                src={single.thumbnails?.[0]?.url}
                                alt={single.title}
                                className="w-full aspect-square object-cover bg-gray-200"
                                onError={(e) => {
                                  e.target.src =
                                    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                                }}
                              />
                              <div className="p-2">
                                <div className="font-semibold text-sm text-black dark:text-white truncate">
                                  {single.title}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {single.type} {single.year && `· ${single.year}`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Related Artists Section */}
          {relatedArtists.length > 0 && (
            <section className="mt-6">
              <h3 className="font-bold text-lg mb-3 text-black dark:text-white flex items-center gap-2">
                <User size={20} />
                Related Artists
              </h3>
              <div className="flex overflow-x-auto gap-4 pb-2 -mx-4 px-4 scrollbar-hide">
                {relatedArtists.map((artist, idx) => (
                  <div
                    key={artist.browseId || idx}
                    onClick={() => {
                      setSearchQuery(artist.artist || artist.name);
                    }}
                    className="flex-shrink-0 w-28 cursor-pointer hover:opacity-80 transition"
                  >
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-200 mb-2">
                      <img
                        src={artist.thumbnails?.[0]?.url || artist.thumbnails?.[1]?.url}
                        alt={artist.artist || artist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=300&h=300&fit=crop';
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-black dark:text-white truncate">
                        {artist.artist || artist.name}
                      </div>
                      {artist.subscribers && (
                        <div className="text-xs text-gray-500">{artist.subscribers}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* No Results */}
          {allTracks.length === 0 && albums.length === 0 && artists.length === 0 && (
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
