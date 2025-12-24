import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Play,
  Shuffle,
  Heart,
  X,
  Loader2,
  ListMusic,
  UserCheck,
  UserPlus,
  Users,
  Music,
} from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import { supabase } from '../lib/supabase';
import { FollowButton } from '../components/social';
import { DEFAULT_AVATAR } from '../components/common';

import {
  useArtistFollow,
  useMusicSearch,
  useUserSearch,
  useExpandedAlbums,
  useShowMore,
  useLikedSongs,
  type SearchAlbum,
  type SearchSong,
  type AlbumTrack,
  type Thumbnail,
  getBestThumbnail,
  songsToPlaylist,
  albumTracksToPlaylist,
  SongListItem,
  AlbumCard,
  ShowMoreButton,
  UserListSection,
  UserProfileItem,
} from '../components/search/SearchHelpers';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

type SearchTab = 'music' | 'users';

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect fill='%23374151' width='120' height='120' rx='60'/%3E%3Ccircle cx='60' cy='45' r='20' fill='%236B7280'/%3E%3Cellipse cx='60' cy='95' rx='35' ry='25' fill='%236B7280'/%3E%3C/svg%3E";

export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { startPlayback, openTrackPanel } = usePlayerStore();

  // Search Hooks
  const {
    performSearch,
    clearSearch: clearMusicSearch,
    searchLoading,
    searchArtist,
    searchAlbums,
    searchSongs,
    setSearchArtist,
  } = useMusicSearch();

  const {
    performUserSearch,
    fetchSuggestedUsers,
    clearUserSearch,
    userResults,
    userSearchLoading,
    suggestedUsers,
    newUsers,
    suggestedLoading,
  } = useUserSearch();

  const { followedArtists, followingArtist, checkArtistFollowed, toggleArtistFollow } =
    useArtistFollow();

  const {
    isExpanded,
    isLoading: isAlbumLoading,
    toggleExpand,
    getCachedTracks,
    cacheTracks,
    setLoading: setAlbumLoading,
    clearExpanded: clearExpandedAlbums,
  } = useExpandedAlbums();

  const { showAll: showAllSongs, toggle: toggleShowAllSongs } = useShowMore(5);

  const { showAll: showAllAlbums, toggle: toggleShowAllAlbums } = useShowMore(4);

  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('music');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // All Songs (YouTube Playlist) State
  const [allSongsExpanded, setAllSongsExpanded] = useState(false);
  const [allSongsTracks, setAllSongsTracks] = useState<SearchSong[]>([]);
  const [allSongsLoading, setAllSongsLoading] = useState(false);

  // Liked Songs Hook
  const { likedSongs, isLiked, toggleLike } = useLikedSongs();
  const [likedAlbums, setLikedAlbums] = useState<Set<string>>(new Set());
  const [savingAlbums, setSavingAlbums] = useState<Set<string>>(new Set());

  // Check follow status when search artist changes
  useEffect(() => {
    if (searchArtist?.browseId) {
      checkArtistFollowed(searchArtist.browseId);
    }
  }, [searchArtist, checkArtistFollowed]);

  // Load suggested users when Users tab is active
  useEffect(() => {
    if (activeTab === 'users' && suggestedUsers.length === 0 && !suggestedLoading) {
      fetchSuggestedUsers();
    }
  }, [activeTab, suggestedUsers.length, suggestedLoading, fetchSuggestedUsers]);

  // Handlers
  const handleSearch = () => {
    if (activeTab === 'music') {
      performSearch(searchQuery);
    } else {
      performUserSearch(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearAll = () => {
    setSearchQuery('');
    clearMusicSearch();
    clearUserSearch();
    clearExpandedAlbums();
    setAllSongsExpanded(false);
    setAllSongsTracks([]);
  };

  // Toggle Album Logic (Expand + Fetch)
  const handleToggleAlbum = async (album: SearchAlbum) => {
    const albumId = album.browseId || `album-${album.title}`;
    toggleExpand(albumId);

    // If already has tracks or cached, no need to fetch
    if ((album.tracks && album.tracks.length > 0) || getCachedTracks(albumId)) return;

    // Only fetch if we are expanding (state logic is tricky here because toggleExpand updates state asynchronously)
    // But we can check our cache directly.
    // If we rely on isExpanded state designated by hook, we might miss the "just expanded" event.
    // However, if we assume we just toggled, we can check logic.
    // Simplified: Check if we have tracks. If not, fetch.
    if (!album.browseId) return;

    if (!getCachedTracks(albumId)) {
      // Double check cache
      setAlbumLoading(albumId, true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/album/${album.browseId}`);
        if (response.ok) {
          const data = await response.json();
          const tracks = data.album?.tracks || data.tracks || [];
          if (tracks.length > 0) {
            cacheTracks(albumId, tracks);
          }
        }
      } catch {
        // ignore
      } finally {
        setAlbumLoading(albumId, false);
      }
    }
  };

  // Playback Handlers
  const handlePlayAlbum = (album: SearchAlbum) => {
    const albumId = album.browseId || `album-${album.title}`;
    const tracks = album.tracks || getCachedTracks(albumId) || [];
    if (tracks.length === 0) return;
    startPlayback(albumTracksToPlaylist(tracks, album), 0);
  };

  const handleShuffleAlbum = (album: SearchAlbum) => {
    const albumId = album.browseId || `album-${album.title}`;
    const tracks = album.tracks || getCachedTracks(albumId) || [];
    if (tracks.length === 0) return;
    const shuffled = [...albumTracksToPlaylist(tracks, album)].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  const handlePlayAlbumTrack = (album: SearchAlbum, index: number) => {
    const albumId = album.browseId || `album-${album.title}`;
    const tracks = album.tracks || getCachedTracks(albumId) || [];
    if (tracks.length === 0) return;
    startPlayback(albumTracksToPlaylist(tracks, album), index);
  };

  const handlePlayAllSongs = () => {
    if (searchSongs.length === 0) return;
    const playlist = songsToPlaylist(searchSongs);
    openTrackPanel({
      title: searchArtist?.artist || t('search.topTracks'),
      author: { name: `${searchSongs.length} ${t('search.tracks')}` },
      thumbnails: searchArtist?.thumbnails,
      tracks: searchSongs.map((s) => ({
        ...s,
        duration: s.duration,
        album: s.album,
        artists: s.artists,
        thumbnails: s.thumbnails,
      })),
      trackCount: searchSongs.length,
    });
    startPlayback(playlist, 0);
  };

  const handleShuffleSearchSongs = () => {
    if (searchSongs.length === 0) return;
    const playlist = songsToPlaylist(searchSongs);
    const shuffled = [...playlist].sort(() => Math.random() - 0.5);
    openTrackPanel({
      title: searchArtist?.artist || t('search.topTracks'),
      author: { name: `${searchSongs.length} ${t('search.tracks')}` },
      thumbnails: searchArtist?.thumbnails,
      tracks: searchSongs.map((s) => ({
        ...s,
        duration: s.duration,
        album: s.album,
        artists: s.artists,
        thumbnails: s.thumbnails,
      })),
      trackCount: searchSongs.length,
    });
    startPlayback(shuffled, 0);
  };

  // Helper to open panel and play songs
  const openPanelAndPlay = (
    songs: SearchSong[],
    title: string,
    index: number,
    thumbnails?: Thumbnail[]
  ) => {
    const playlist = songsToPlaylist(songs);
    openTrackPanel({
      title,
      author: { name: `${songs.length} ${t('search.tracks')}` },
      thumbnails,
      tracks: songs.map((s) => ({
        videoId: s.videoId,
        title: s.title,
        artists: s.artists,
        thumbnails: s.thumbnails,
        duration: s.duration,
        album: s.album,
      })),
      trackCount: songs.length,
    });
    startPlayback(playlist, index);
  };

  // Play track from All Songs list
  const handlePlayAllSongsTrack = (track: SearchSong, index: number) => {
    openPanelAndPlay(
      allSongsTracks,
      `${searchArtist?.artist || 'Artist'} - All Songs`,
      index,
      searchArtist?.thumbnails
    );
  };

  // Play a single track from search - opens popup with all songs
  const handlePlayTrackFromSearch = (track: SearchSong, index: number) => {
    openPanelAndPlay(
      searchSongs,
      searchArtist?.artist || t('search.topTracks'),
      index,
      searchArtist?.thumbnails
    );
  };

  // Toggle All Songs (Fetch Playlist)
  const toggleAllSongs = async () => {
    if (allSongsExpanded) {
      setAllSongsExpanded(false);
      return;
    }
    setAllSongsExpanded(true);
    if (allSongsTracks.length > 0) return;
    if (!searchArtist?.songsPlaylistId) return;

    setAllSongsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlist/${searchArtist.songsPlaylistId}`);
      if (response.ok) {
        const data = await response.json();
        const tracks = data.playlist?.tracks || [];
        // Conform to SearchSong interface
        setAllSongsTracks(
          tracks.map((t: any) => ({
            videoId: t.videoId,
            title: t.title,
            artists: t.artists,
            thumbnails: t.thumbnails,
            duration: t.duration,
            album: t.album,
          }))
        );
      }
    } catch {
      // ignore
    } finally {
      setAllSongsLoading(false);
    }
  };

  // Toggle Like uses hook
  const handleToggleLike = (item: SearchSong | AlbumTrack) => {
    toggleLike(item);
  };

  const handleToggleAlbumLike = async (album: SearchAlbum) => {
    const albumId = album.browseId || `album-${album.title}`;
    if (!user || savingAlbums.has(albumId)) return;

    const albumIsLiked = likedAlbums.has(albumId);
    setSavingAlbums((prev) => new Set(prev).add(albumId));

    try {
      if (albumIsLiked) {
        setLikedAlbums((prev) => {
          const n = new Set(prev);
          n.delete(albumId);
          return n;
        });
      } else {
        const tracks = album.tracks || getCachedTracks(albumId) || [];
        for (const track of tracks) {
          if (!likedSongs.has(track.videoId)) {
            await toggleLike(track);
          }
        }
        setLikedAlbums((prev) => new Set(prev).add(albumId));
      }
    } finally {
      setSavingAlbums((prev) => {
        const n = new Set(prev);
        n.delete(albumId);
        return n;
      });
    }
  };

  const hasResults = searchArtist || searchSongs.length > 0 || searchAlbums.length > 0;
  const hasUserResults = userResults.length > 0;
  const isLoading = activeTab === 'music' ? searchLoading : userSearchLoading;

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-20">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-2 px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                activeTab === 'music' ? t('search.placeholder') : t('search.searchUsers')
              }
              className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={clearAll}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={searchQuery.trim().length < 2 || isLoading}
            className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
          </button>
        </div>

        <div className="flex border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('music')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
              activeTab === 'music'
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Music size={18} /> {t('search.music')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
              activeTab === 'users'
                ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users size={18} /> {t('search.users')}
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'users' && (
          <>
            {userSearchLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-gray-500" />
              </div>
            ) : hasUserResults ? (
              <div className="space-y-2">
                {userResults.map((profile) => (
                  <UserProfileItem
                    key={profile.id}
                    profile={profile}
                    onNavigate={(id) => navigate(`/profile/${id}`)}
                    followButton={<FollowButton userId={profile.id} size="sm" />}
                    defaultAvatar={DEFAULT_AVATAR}
                  />
                ))}
              </div>
            ) : suggestedLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-gray-500" />
              </div>
            ) : suggestedUsers.length > 0 || newUsers.length > 0 ? (
              <div className="space-y-6">
                <UserListSection
                  title={t('search.suggestedForYou')}
                  users={suggestedUsers}
                  onNavigate={(id) => navigate(`/profile/${id}`)}
                  renderFollowButton={(id) => <FollowButton userId={id} size="sm" />}
                  defaultAvatar={DEFAULT_AVATAR}
                />
                <UserListSection
                  title={t('search.newToSori')}
                  users={newUsers}
                  onNavigate={(id) => navigate(`/profile/${id}`)}
                  renderFollowButton={(id) => <FollowButton userId={id} size="sm" />}
                  defaultAvatar={DEFAULT_AVATAR}
                />
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('search.searchForUsers')}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'music' && (
          <>
            {searchLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={32} className="animate-spin text-gray-500" />
              </div>
            ) : hasResults ? (
              <div className="space-y-6">
                {/* Artist Card */}
                {searchArtist && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                      <img
                        src={getBestThumbnail(searchArtist.thumbnails)}
                        alt={searchArtist.artist}
                        className="w-20 h-20 rounded-full object-cover bg-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-black dark:text-white truncate">
                          {searchArtist.artist}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {searchArtist.subscribers || 'Artist'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          searchArtist.browseId &&
                          toggleArtistFollow(searchArtist.browseId, searchArtist.artist)
                        }
                        disabled={followingArtist}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          searchArtist.browseId && followedArtists.has(searchArtist.browseId)
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {searchArtist.browseId && followedArtists.has(searchArtist.browseId) ? (
                          <>
                            <UserCheck size={16} /> Following
                          </>
                        ) : (
                          <>
                            <UserPlus size={16} /> Follow
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2 px-4 pb-4">
                      <button
                        onClick={handlePlayAllSongs}
                        className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition"
                      >
                        <Play size={16} fill="currentColor" /> {t('player.playAll')}
                      </button>
                      <button
                        onClick={handleShuffleSearchSongs}
                        className="flex-1 flex items-center justify-center gap-2 border border-black dark:border-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        <Shuffle size={16} /> {t('player.shufflePlay')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Top Tracks */}
                {searchSongs.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                      {t('search.topTracks')}
                    </h3>
                    <div className="space-y-1">
                      {(showAllSongs ? searchSongs : searchSongs.slice(0, 5)).map((song, i) => (
                        <SongListItem
                          key={song.videoId || i}
                          song={song}
                          index={i}
                          onPlay={(index) => handlePlayTrackFromSearch(song, index)}
                          isLiked={likedSongs.has(song.videoId)}
                          onToggleLike={() => handleToggleLike(song)}
                        />
                      ))}
                    </div>
                    {searchSongs.length > 5 && (
                      <ShowMoreButton
                        showAll={showAllSongs}
                        remainingCount={searchSongs.length - 5}
                        onToggle={toggleShowAllSongs}
                      />
                    )}
                  </div>
                )}

                {/* All Songs */}
                {searchArtist?.songsPlaylistId && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
                    <button
                      onClick={toggleAllSongs}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center">
                          <ListMusic size={16} className="text-white" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold">{t('search.allSongs')}</div>
                        </div>
                      </div>
                      {allSongsLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : allSongsExpanded ? (
                        <Users size={18} className="rotate-180" />
                      ) : (
                        <Users size={18} />
                      )}{' '}
                      {/* Icon placeholder fix later */}
                    </button>
                    {allSongsExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        {allSongsLoading ? (
                          <div className="p-4 text-center">
                            <Loader2 className="animate-spin inline" />
                          </div>
                        ) : (
                          allSongsTracks.map((song, i) => (
                            <div
                              key={song.videoId || i}
                              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <SongListItem
                                song={song}
                                index={i}
                                onPlay={() => handlePlayAllSongsTrack(song, i)}
                                isLiked={likedSongs.has(song.videoId)}
                                onToggleLike={() => handleToggleLike(song)}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Albums */}
                {searchAlbums.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold mb-3 text-black dark:text-white">
                      {t('search.albumsAndSingles')}
                    </h3>
                    <div className="space-y-3">
                      {(showAllAlbums ? searchAlbums : searchAlbums.slice(0, 4)).map((album) => {
                        const albumId = album.browseId || `album-${album.title}`;
                        return (
                          <AlbumCard
                            key={albumId}
                            album={album}
                            isExpanded={isExpanded(albumId)}
                            isLoading={isAlbumLoading(albumId)}
                            tracks={album.tracks || getCachedTracks(albumId)}
                            onToggleExpand={() => handleToggleAlbum(album)}
                            onPlayAll={() => handlePlayAlbum(album)}
                            onShuffle={() => handleShuffleAlbum(album)}
                            onPlayTrack={(idx) => handlePlayAlbumTrack(album, idx)}
                          />
                        );
                      })}
                    </div>
                    {searchAlbums.length > 4 && (
                      <ShowMoreButton
                        showAll={showAllAlbums}
                        remainingCount={searchAlbums.length - 4}
                        onToggle={toggleShowAllAlbums}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Music size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('search.startTyping') || 'Start typing to search'}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
