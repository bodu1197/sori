// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import {
  Grid,
  Heart,
  Lock,
  Play,
  LogOut,
  Search,
  Music,
  Shuffle,
  Trash2,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore from '../stores/usePlayerStore';
import { supabase } from '../lib/supabase';

// Cloud Run 백엔드 API (ytmusicapi 사용)
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

function StatItem({ count, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold text-lg leading-tight">{count}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  );
}

// Track Item Component for Your Music list
function TrackItem({ track, index, onPlay, onDelete, isPlaying, isCurrentTrack }) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      onClick={() => onPlay(track, index)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isCurrentTrack ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
    >
      {/* Thumbnail with play indicator */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <img
          src={track.thumbnail || track.cover_url}
          alt={track.title}
          className="w-full h-full rounded object-cover"
          onError={(e) => {
            e.target.src =
              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
          }}
        />
        {isCurrentTrack && isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
            <div className="flex gap-0.5">
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-0.5 h-3 bg-white animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <div
          className={`font-medium text-sm truncate ${isCurrentTrack ? 'text-black dark:text-white' : ''}`}
        >
          {track.title}
        </div>
        <div className="text-xs text-gray-500 truncate">{track.artist || 'Unknown Artist'}</div>
      </div>

      {/* Delete Button (on hover) */}
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(track);
          }}
          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
          title="Remove from liked"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Play Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlay(track, index);
        }}
        className="p-2 text-gray-500 hover:text-black dark:hover:text-white"
      >
        {isCurrentTrack && isPlaying ? (
          <Music size={18} className="text-black dark:text-white" />
        ) : (
          <Play size={18} fill="currentColor" />
        )}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const { setTrack, startPlayback, currentTrack, isPlaying } = usePlayerStore();

  const [activeTab, setActiveTab] = useState('playlists');
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  // External Search State (Cloud Run API - ytmusicapi)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;

      try {
        setLoading(true);

        // 1. Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // 2. Fetch User's Playlists
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (playlistError) throw playlistError;
        setPlaylists(playlistData || []);

        // 3. Fetch Liked Songs (using playlists with video_id as liked songs for now)
        // In future, create a separate liked_songs table
        const likedData = (playlistData || [])
          .filter((p) => p.video_id)
          .map((p) => ({
            videoId: p.video_id,
            title: p.title,
            artist: profileData?.username || 'You',
            thumbnail: p.cover_url,
            cover: p.cover_url,
            playlistId: p.id,
          }));
        setLikedSongs(likedData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, [user]);

  // Comprehensive Music Search via Cloud Run API (ytmusicapi) - Summary endpoint
  // Returns all artist data including full discography (like sample folder)
  useEffect(() => {
    if (searchQuery.length > 1) {
      setSearchLoading(true);
      setShowSearchPanel(true);

      const timer = setTimeout(async () => {
        try {
          // Use summary endpoint for comprehensive search (like sample folder)
          const response = await fetch(
            `${API_BASE_URL}/api/search/summary?q=${encodeURIComponent(searchQuery)}`
          );

          if (response.ok) {
            const data = await response.json();

            // Process all tracks from albums2 (artist discography)
            const allTracks = [];
            const seenVideoIds = new Set();

            // 1. Add songs from direct search
            (data.songs || []).forEach((song) => {
              if (song.videoId && !seenVideoIds.has(song.videoId)) {
                seenVideoIds.add(song.videoId);
                allTracks.push({
                  ...song,
                  resultType: 'song',
                  artist: song.artists?.[0]?.name || 'Unknown Artist',
                });
              }
            });

            // 2. Add tracks from albums2 (artist's complete discography)
            (data.albums2 || []).forEach((item) => {
              // If item has tracks array (it's an album/single)
              if (item.tracks && Array.isArray(item.tracks)) {
                item.tracks.forEach((track) => {
                  if (track.videoId && !seenVideoIds.has(track.videoId)) {
                    seenVideoIds.add(track.videoId);
                    allTracks.push({
                      ...track,
                      resultType: 'song',
                      album: item.title,
                      albumThumbnail: item.thumbnails?.[0]?.url,
                      artist:
                        track.artists?.[0]?.name || item.artists?.[0]?.name || 'Unknown Artist',
                      thumbnail: track.thumbnails?.[0]?.url || item.thumbnails?.[0]?.url,
                    });
                  }
                });
              } else if (item.videoId && !seenVideoIds.has(item.videoId)) {
                // Direct song from artist
                seenVideoIds.add(item.videoId);
                allTracks.push({
                  ...item,
                  resultType: 'song',
                  artist: item.artists?.[0]?.name || 'Unknown Artist',
                });
              }
            });

            // 3. Add albums from search
            const albums = (data.albums || []).map((album) => ({
              ...album,
              resultType: 'album',
            }));

            // Combine: songs first, then albums
            setSearchResults([...allTracks, ...albums]);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 500); // Slightly longer debounce for comprehensive search

      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      if (searchQuery.length === 0) {
        setShowSearchPanel(false);
      }
    }
  }, [searchQuery]);

  // Close search panel
  const closeSearchPanel = () => {
    setShowSearchPanel(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Play a single playlist
  const handlePlayPlaylist = (playlist) => {
    if (!playlist.video_id) return;

    const track = {
      videoId: playlist.video_id,
      title: playlist.title || 'Unknown Playlist',
      artist: profile?.username || 'You',
      thumbnail: playlist.cover_url,
      cover: playlist.cover_url,
    };

    setTrack(track);
  };

  // Play a track from liked songs
  const handlePlayTrack = (track, index) => {
    if (likedSongs.length > 0) {
      // Start playback with full liked songs list
      const tracks = likedSongs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        thumbnail: s.thumbnail,
        cover: s.cover,
      }));
      startPlayback(tracks, index);
    } else {
      setTrack(track);
    }
  };

  // Shuffle play all liked songs
  const handleShufflePlay = () => {
    if (likedSongs.length === 0) return;

    const tracks = likedSongs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      cover: s.cover,
    }));

    // Shuffle the tracks
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Delete a liked song
  const handleDeleteSong = async (track) => {
    if (!track.playlistId) return;

    try {
      const { error } = await supabase.from('playlists').delete().eq('id', track.playlistId);

      if (error) throw error;

      // Update local state
      setLikedSongs((prev) => prev.filter((s) => s.playlistId !== track.playlistId));
      setPlaylists((prev) => prev.filter((p) => p.id !== track.playlistId));
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  // Play search result from Cloud Run API (ytmusicapi)
  const handlePlaySearchResult = (item) => {
    if (!item.videoId) return;

    const track = {
      videoId: item.videoId,
      title: item.title,
      artist: item.artists?.[0]?.name || 'Unknown Artist',
      thumbnail: item.thumbnails?.[0]?.url || item.thumbnail,
      cover: item.thumbnails?.[0]?.url || item.thumbnail,
    };

    setTrack(track);
    closeSearchPanel();
  };

  // Add song to liked (save to Supabase)
  const handleAddToLiked = async (item) => {
    if (!item.videoId || !user) return;

    try {
      const { error } = await supabase.from('playlists').insert({
        user_id: user.id,
        title: item.title,
        video_id: item.videoId,
        cover_url: item.thumbnails?.[0]?.url || item.thumbnail,
        is_public: true,
      });

      if (error) throw error;

      // Refresh liked songs
      const newLikedSong = {
        videoId: item.videoId,
        title: item.title,
        artist: item.artists?.[0]?.name || 'Unknown Artist',
        thumbnail: item.thumbnails?.[0]?.url || item.thumbnail,
        cover: item.thumbnails?.[0]?.url || item.thumbnail,
      };
      setLikedSongs((prev) => [newLikedSong, ...prev]);
    } catch (error) {
      console.error('Error adding to liked:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      <div className="px-4 pt-4 pb-4">
        {/* Top Section: Avatar + Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-gray-200 to-gray-200">
              <img
                src={
                  profile?.avatar_url ||
                  user?.user_metadata?.avatar_url ||
                  'https://via.placeholder.com/150'
                }
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-around ml-4">
            <StatItem count={playlists.length} label="Playlists" />
            <StatItem count={likedSongs.length} label="Liked" />
            <StatItem count={0} label="Following" />
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4">
          <h2 className="font-bold text-sm">
            {profile?.full_name || user?.user_metadata?.full_name || 'No Name'}
          </h2>
          <span className="text-xs text-gray-500 block mb-1">
            @{profile?.username || 'username'}
          </span>
          <p className="text-sm whitespace-pre-line">{profile?.website || 'Music is life 🎵'}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            Edit profile
          </button>
          <button
            onClick={signOut}
            className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-red-500"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* External Search Box - Always Visible */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search music on YouTube Music..."
            className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={closeSearchPanel}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Panel - Inline, not fixed */}
      {showSearchPanel && (
        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-white dark:bg-[#121212] border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-black dark:text-white" />
                <span className="font-semibold text-sm text-black dark:text-white">
                  {searchLoading ? 'Searching...' : `${searchResults.length} results`}
                </span>
              </div>
              <button
                onClick={closeSearchPanel}
                className="p-1 text-gray-500 hover:text-black dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search Results List */}
          <div className="overflow-y-auto px-4 py-2 max-h-[50vh]">
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((item, idx) => {
                  const thumbnail = item.thumbnails?.[0]?.url || item.thumbnail;
                  const artist = item.artists?.[0]?.name || item.artist || 'Unknown Artist';
                  const isAlbum = item.resultType === 'album';
                  const itemId = item.videoId || item.browseId || idx;
                  const isCurrentlyPlaying = currentTrack?.videoId === item.videoId && isPlaying;

                  return (
                    <div
                      key={itemId}
                      className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg cursor-pointer group"
                    >
                      {/* Thumbnail */}
                      <div
                        className="relative w-12 h-12 flex-shrink-0"
                        onClick={() => !isAlbum && handlePlaySearchResult(item)}
                      >
                        <img
                          src={thumbnail}
                          alt={item.title}
                          className={`w-full h-full object-cover bg-gray-200 ${isAlbum ? 'rounded' : 'rounded'}`}
                          onError={(e) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                          }}
                        />
                        {/* Album Badge */}
                        {isAlbum && (
                          <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] px-1 rounded">
                            ALBUM
                          </div>
                        )}
                        {!isAlbum && isCurrentlyPlaying ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                            <div className="flex gap-0.5">
                              <div
                                className="w-0.5 h-3 bg-white animate-bounce"
                                style={{ animationDelay: '0ms' }}
                              />
                              <div
                                className="w-0.5 h-3 bg-white animate-bounce"
                                style={{ animationDelay: '150ms' }}
                              />
                              <div
                                className="w-0.5 h-3 bg-white animate-bounce"
                                style={{ animationDelay: '300ms' }}
                              />
                            </div>
                          </div>
                        ) : !isAlbum ? (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={16} fill="white" className="text-white" />
                          </div>
                        ) : null}
                      </div>

                      {/* Track/Album Info */}
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => !isAlbum && handlePlaySearchResult(item)}
                      >
                        <div className="font-medium text-sm truncate text-black dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {isAlbum ? `Album - ${artist}` : artist}
                          {item.year && ` (${item.year})`}
                        </div>
                      </div>

                      {/* Add to Liked Button (only for songs) */}
                      {!isAlbum && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToLiked(item);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                          title="Add to Your Music"
                        >
                          <Heart size={18} />
                        </button>
                      )}

                      {/* Play Button (only for songs) */}
                      {!isAlbum && (
                        <button
                          onClick={() => handlePlaySearchResult(item)}
                          className="p-2 text-gray-500 hover:text-black dark:hover:text-white"
                        >
                          <Play size={18} fill="currentColor" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.length > 1 ? (
              <div className="text-center text-gray-500 py-8">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p>No results found</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'playlists' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Grid size={24} />
        </button>
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'liked' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Heart size={24} />
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'private' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Lock size={24} />
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'liked' ? (
        // Your Music (Liked Songs) Tab
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg">Your Music</h3>
              <p className="text-xs text-gray-500">{likedSongs.length} songs</p>
            </div>
            {likedSongs.length > 0 && (
              <button
                onClick={handleShufflePlay}
                className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full text-sm font-semibold hover:opacity-80 transition"
              >
                <Shuffle size={16} />
                Shuffle
              </button>
            )}
          </div>

          {/* Track List */}
          <div className="space-y-1">
            {likedSongs.length > 0 ? (
              likedSongs.map((track, index) => (
                <TrackItem
                  key={track.playlistId || index}
                  track={track}
                  index={index}
                  onPlay={handlePlayTrack}
                  onDelete={handleDeleteSong}
                  isPlaying={isPlaying}
                  isCurrentTrack={currentTrack?.videoId === track.videoId}
                />
              ))
            ) : (
              <div className="py-10 text-center text-gray-500">
                <Heart size={48} className="mx-auto mb-2 opacity-50" />
                <p>No liked songs yet.</p>
                <p className="text-sm mt-1">Your favorite music will appear here.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'playlists' ? (
        // Playlists Grid Tab
        <div className="grid grid-cols-3 gap-0.5">
          {playlists.length > 0 ? (
            playlists.map((playlist) => {
              const isCurrentlyPlaying = currentTrack?.videoId === playlist.video_id && isPlaying;
              return (
                <div
                  key={playlist.id}
                  onClick={() => handlePlayPlaylist(playlist)}
                  className="aspect-square relative group bg-gray-100 cursor-pointer"
                >
                  <img
                    src={
                      playlist.cover_url ||
                      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
                    }
                    alt="cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                    }}
                  />
                  {/* Overlay */}
                  <div
                    className={`absolute inset-0 transition-opacity ${
                      isCurrentlyPlaying
                        ? 'bg-black/40 opacity-100'
                        : 'bg-black/0 group-hover:bg-black/30 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isCurrentlyPlaying ? (
                        <div className="flex gap-1">
                          <div
                            className="w-1 h-6 bg-white animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          ></div>
                          <div
                            className="w-1 h-6 bg-white animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          ></div>
                          <div
                            className="w-1 h-6 bg-white animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          ></div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play size={20} className="text-white ml-0.5" fill="white" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-white text-xs font-medium line-clamp-1">
                      {playlist.title}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 py-10 text-center text-gray-500 text-sm">
              No playlists yet. Create one!
            </div>
          )}
        </div>
      ) : (
        // Private Tab
        <div className="py-20 text-center text-gray-500">
          <Lock size={48} className="mx-auto mb-2 opacity-50" />
          <p>This section is private.</p>
        </div>
      )}
    </div>
  );
}
