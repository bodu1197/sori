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
  ChevronDown,
  ChevronUp,
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const searchInputRef = useRef(null);

  // Artist search data (for TestSearchPage-style display)
  const [searchArtist, setSearchArtist] = useState(null);
  const [searchAlbums, setSearchAlbums] = useState([]);
  const [searchSongs, setSearchSongs] = useState([]);
  const [expandedAlbums, setExpandedAlbums] = useState(new Set());

  // Placeholder image for artist/album
  const PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect fill='%23374151' width='120' height='120' rx='60'/%3E%3Ccircle cx='60' cy='45' r='20' fill='%236B7280'/%3E%3Cellipse cx='60' cy='95' rx='35' ry='25' fill='%236B7280'/%3E%3C/svg%3E";

  // Helper to get best (largest) thumbnail
  const getBestThumbnail = (thumbnails) => {
    if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
      return PLACEHOLDER;
    }
    // Prefer larger thumbnails (index 1 or 2 if available)
    return thumbnails[2]?.url || thumbnails[1]?.url || thumbnails[0]?.url || PLACEHOLDER;
  };

  // Toggle album expansion
  const toggleAlbumExpand = (albumId) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });
  };

  // Play album tracks
  const handlePlayAlbum = (album) => {
    if (!album.tracks || album.tracks.length === 0) return;
    const playlist = album.tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
    }));
    startPlayback(playlist, 0);
  };

  // Shuffle album tracks
  const handleShuffleAlbum = (album) => {
    if (!album.tracks || album.tracks.length === 0) return;
    const playlist = album.tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
    }));
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Play a track from album
  const handlePlayAlbumTrack = (album, trackIndex) => {
    if (!album.tracks || album.tracks.length === 0) return;
    const playlist = album.tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.[0]?.name || 'Unknown',
      thumbnail: getBestThumbnail(t.thumbnails) || getBestThumbnail(album.thumbnails),
    }));
    startPlayback(playlist, trackIndex);
  };

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

            // Store artist data (first artist from results)
            const artist = data.artists?.[0] || null;
            setSearchArtist(artist);

            // Store albums (albums2 from API)
            setSearchAlbums(data.albums2 || []);

            // Store songs
            setSearchSongs(data.songs || []);
          } else {
            setSearchArtist(null);
            setSearchAlbums([]);
            setSearchSongs([]);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchArtist(null);
          setSearchAlbums([]);
          setSearchSongs([]);
        } finally {
          setSearchLoading(false);
        }
      }, 500); // Slightly longer debounce for comprehensive search

      return () => clearTimeout(timer);
    } else {
      setSearchArtist(null);
      setSearchAlbums([]);
      setSearchSongs([]);
      if (searchQuery.length === 0) {
        setShowSearchPanel(false);
      }
    }
  }, [searchQuery]);

  // Close search panel
  const closeSearchPanel = () => {
    setShowSearchPanel(false);
    setSearchQuery('');
    setSearchArtist(null);
    setSearchAlbums([]);
    setSearchSongs([]);
    setExpandedAlbums(new Set());
  };

  // Play a single track from search
  const handlePlayTrackFromSearch = (track) => {
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

  // Play all songs from search
  const handlePlayAllSongs = () => {
    if (searchSongs.length === 0) return;
    const playlist = searchSongs.slice(0, 20).map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown',
      thumbnail: song.thumbnails?.[0]?.url,
    }));
    startPlayback(playlist, 0);
  };

  // Shuffle songs from search
  const handleShuffleSearchSongs = () => {
    if (searchSongs.length === 0) return;
    const playlist = searchSongs.slice(0, 20).map((song) => ({
      videoId: song.videoId,
      title: song.title,
      artist: song.artists?.[0]?.name || 'Unknown',
      thumbnail: song.thumbnails?.[0]?.url,
    }));
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  // Search for similar artist
  const handleSearchSimilarArtist = (artistName) => {
    setSearchQuery(artistName);
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

      {/* Search Results Panel - Sample Folder Style */}
      {showSearchPanel && (
        <div className="bg-white dark:bg-black text-black dark:text-white p-4 pb-8 min-h-screen">
          {/* Close Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={closeSearchPanel}
              className="p-2 text-gray-500 hover:text-black dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={24} />
            </button>
          </div>

          {searchLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Artist Card */}
              {searchArtist && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    {/* Artist Thumbnail */}
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      <img
                        src={getBestThumbnail(searchArtist.thumbnails)}
                        alt={searchArtist.artist}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = PLACEHOLDER;
                        }}
                      />
                    </div>
                    {/* Artist Info */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-black dark:text-white mb-1">
                        {searchArtist.artist}
                      </h2>
                      <p className="text-sm text-gray-500 mb-3">
                        {searchArtist.subscribers || 'Artist'}
                      </p>
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handlePlayAllSongs}
                          className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full text-sm font-semibold hover:opacity-80 transition"
                        >
                          <Play size={14} fill="currentColor" /> Play All
                        </button>
                        <button
                          onClick={handleShuffleSearchSongs}
                          className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                          <Shuffle size={14} /> Shuffle
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-500">
                          <Heart size={20} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Similar Artists */}
                  {searchArtist.related && searchArtist.related.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Similar Artists
                      </h4>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {searchArtist.related.slice(0, 6).map((r, i) => (
                          <div
                            key={i}
                            className="flex flex-col items-center flex-shrink-0 cursor-pointer hover:opacity-80"
                            onClick={() => handleSearchSimilarArtist(r.artist || r.name)}
                          >
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mb-1">
                              <img
                                src={getBestThumbnail(r.thumbnails)}
                                alt={r.artist || r.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 text-center w-16 truncate">
                              {r.artist || r.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top Tracks */}
              {searchSongs.length > 0 && (
                <div>
                  <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                    Top Tracks ({searchSongs.length})
                  </h3>
                  <div className="space-y-1">
                    {searchSongs.slice(0, 20).map((song, i) => (
                      <div
                        key={song.videoId || i}
                        onClick={() => handlePlayTrackFromSearch(song)}
                        className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        <span className="w-6 text-center text-sm text-gray-400">{i + 1}</span>
                        <img
                          src={getBestThumbnail(song.thumbnails)}
                          alt={song.title}
                          className="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-gray-700"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-black dark:text-white truncate">
                            {song.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {song.artists?.[0]?.name}
                            {song.album?.name && ` • ${song.album.name}`}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{song.duration}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToLiked(song);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <Heart size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums & Singles */}
              {searchAlbums.length > 0 && (
                <div>
                  <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                    Albums & Singles ({searchAlbums.length})
                  </h3>
                  <div className="space-y-3">
                    {searchAlbums.slice(0, 15).map((album, i) => {
                      const albumId = album.browseId || `album-${i}`;
                      const isExpanded = expandedAlbums.has(albumId);
                      const trackCount = album.tracks?.length || 0;

                      return (
                        <div
                          key={albumId}
                          className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden"
                        >
                          {/* Album Header */}
                          <div className="flex items-start gap-3 p-3">
                            <img
                              src={getBestThumbnail(album.thumbnails)}
                              alt={album.title}
                              className="w-20 h-20 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-black dark:text-white truncate">
                                {album.title}
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                {album.type || 'Album'}
                                {album.year && ` • ${album.year}`}
                                {trackCount > 0 && ` • ${trackCount} tracks`}
                              </div>
                              {/* Album Action Buttons */}
                              <div className="flex flex-wrap gap-1.5">
                                {trackCount > 0 && (
                                  <>
                                    <button
                                      onClick={() => handlePlayAlbum(album)}
                                      className="flex items-center gap-1 bg-black dark:bg-white text-white dark:text-black px-3 py-1 rounded-full text-xs font-semibold hover:opacity-80"
                                    >
                                      <Play size={12} fill="currentColor" /> Play
                                    </button>
                                    <button
                                      onClick={() => handleShuffleAlbum(album)}
                                      className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                      <Shuffle size={12} /> Shuffle
                                    </button>
                                    <button
                                      onClick={() => toggleAlbumExpand(albumId)}
                                      className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                      Tracks ({trackCount})
                                      {isExpanded ? (
                                        <ChevronUp size={12} />
                                      ) : (
                                        <ChevronDown size={12} />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Album Track List (Expandable) */}
                          {isExpanded && album.tracks && album.tracks.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
                              {album.tracks.map((track, trackIdx) => (
                                <div
                                  key={track.videoId || trackIdx}
                                  onClick={() => handlePlayAlbumTrack(album, trackIdx)}
                                  className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 -mx-2"
                                >
                                  <span className="w-5 text-center text-xs text-gray-400">
                                    {trackIdx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-black dark:text-white truncate">
                                      {track.title}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {track.duration || ''}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToLiked({
                                        ...track,
                                        thumbnails: track.thumbnails || album.thumbnails,
                                      });
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <Heart size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!searchArtist &&
                searchSongs.length === 0 &&
                searchAlbums.length === 0 &&
                searchQuery.length > 1 && (
                  <div className="text-center py-16 text-gray-500">
                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No results found</p>
                  </div>
                )}
            </div>
          )}
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
