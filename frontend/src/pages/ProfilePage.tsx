import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grid, Heart, Lock, LogOut, Music, Disc, Settings, UserPlus, Plus } from 'lucide-react';
import useAuthStore from '../stores/useAuthStore';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import FollowersModal from '../components/social/FollowersModal';
import FollowButton from '../components/social/FollowButton';
import { DEFAULT_AVATAR } from '../components/common';
import {
  useHomeData,
  useProfilePlayback,
  useConversation,
  useProfileData,
  PostsGrid,
  DiscoverTab,
  PrivateTab,
  ArtistMusicTab,
  LikedMusicTab,
  UserSavedMusicTab,
  type Post,
  type Playlist,
  type LikedTrack,
  type HomeSection,
  type HomeContentItem,
} from './ProfilePageHelpers';

interface StatItemProps {
  readonly count: number;
  readonly label: string;
}

function StatItem({ count, label }: StatItemProps) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold text-lg leading-tight">{count}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  );
}

// Types are imported from ProfilePageHelpers

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user, signOut } = useAuthStore();
  const { setTrack, startPlayback, currentTrack, isPlaying } = usePlayerStore();

  // Determine if viewing own profile or another user's
  const isOwnProfile = !paramUserId || paramUserId === user?.id;
  const targetUserId = isOwnProfile ? user?.id : paramUserId;

  // activeTab will be set after profile loads for virtual members
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'discover' | 'private' | 'music'>(
    isOwnProfile ? 'discover' : 'music'
  );
  const [showAllSongs, setShowAllSongs] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);

  // Follow modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Use extracted hooks for data fetching
  const {
    profile,
    setProfile,
    posts,
    playlists,
    setPlaylists,
    likedSongs,
    userSavedSongs,
    loading,
    artistSongs,
    artistAlbums,
    artistVideos,
    similarArtists,
    artistMusicLoading,
    isVirtualMember,
    deleteSong,
    setLikedSongs,
  } = useProfileData(targetUserId, isOwnProfile);

  // Use extracted playback hook
  const {
    playHomeItem,
    playPost,
    playLikedTrack,
    shufflePlay,
    fetchAndShowPlaylist,
    fetchAndShowAlbum,
  } = useProfilePlayback();

  const { homeData, homeLoading } = useHomeData(activeTab);
  const { startConversation, startingConversation } = useConversation(targetUserId, isOwnProfile);

  // Dynamic recommendations passed from FeedPage
  const location = useLocation();
  const [recommendedTracks, setRecommendedTracks] = useState<PlaylistTrackData[]>([]);
  const [recommendationContext, setRecommendationContext] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (location.state?.recommendedTracks) {
      setRecommendedTracks(location.state.recommendedTracks);
      setRecommendationContext({
        title: location.state.contextTitle,
        message: location.state.contextMessage,
      });
      if (isOwnProfile) {
        setActiveTab('liked');
      }
    }
  }, [location.state, isOwnProfile]);

  // Wrapper handlers using extracted hooks
  const handlePlayTrack = (track: LikedTrack, index: number) =>
    playLikedTrack(track, index, likedSongs);
  const handleShufflePlay = () => shufflePlay(likedSongs);
  const handlePlayPost = (post: Post) => playPost(post, profile);
  const handlePlayHomeItem = (item: HomeContentItem, section: HomeSection) =>
    playHomeItem(item, section);
  const handlePlayPlaylist = (playlist: Playlist) => {
    if (!playlist.video_id) return;
    setTrack({
      videoId: playlist.video_id,
      title: playlist.title || t('profile.playlist'),
      artist: profile?.username || t('profile.you', 'You'),
      thumbnail: playlist.cover_url,
      cover: playlist.cover_url,
    });
  };
  const handleDeleteSong = (track: LikedTrack) => {
    deleteSong(track);
    setPlaylists((prev) => prev.filter((p) => p.id !== track.playlistId));
  };
  const handlePlayRecommendedTrack = (tracks: PlaylistTrackData[], index: number) => {
    const formattedTracks = tracks.map((r) => {
      const thumb = r.videoId
        ? `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`
        : r.thumbnails?.[0]?.url || '';
      return {
        videoId: r.videoId,
        title: r.title,
        artist:
          typeof r.artists?.[0] === 'string' ? r.artists[0] : r.artists?.[0]?.name || 'Unknown',
        thumbnail: thumb,
        cover: thumb,
      };
    });
    startPlayback(formattedTracks, index);
  };

  // Artist music handlers (extracted to reduce complexity)
  const handleArtistPlaySong = (
    songs: Array<{
      videoId: string;
      title: string;
      artists?: Array<{ name: string }>;
      thumbnails?: Array<{ url: string }>;
    }>,
    index: number
  ) => {
    const tracks = songs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artists?.[0]?.name || profile?.full_name || 'Unknown',
      thumbnail: s.thumbnails?.[0]?.url,
    }));
    startPlayback(tracks, index);
  };

  const handleArtistShufflePlay = (
    songs: Array<{
      videoId: string;
      title: string;
      artists?: Array<{ name: string }>;
      thumbnails?: Array<{ url: string }>;
    }>
  ) => {
    const tracks = songs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artists?.[0]?.name || profile?.full_name || 'Unknown',
      thumbnail: s.thumbnails?.[0]?.url,
    }));
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  const handleArtistPlayVideo = (video: {
    videoId: string;
    title: string;
    artists?: Array<{ name: string }>;
    thumbnails?: Array<{ url: string }>;
  }) => {
    setTrack({
      videoId: video.videoId,
      title: video.title,
      artist: video.artists?.[0]?.name || profile?.full_name || 'Unknown',
      thumbnail: video.thumbnails?.[0]?.url,
    });
  };

  // User saved music handlers
  const handleUserSavedPlayTrack = (track: LikedTrack, idx: number, songs: LikedTrack[]) => {
    const tracks = songs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      cover: s.cover,
    }));
    startPlayback(tracks, idx);
  };

  const handleUserSavedShufflePlay = (songs: LikedTrack[]) => {
    const tracks = songs.map((s) => ({
      videoId: s.videoId,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail,
      cover: s.cover,
    }));
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    startPlayback(shuffled, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">{t('common.loading')}</div>
    );
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
                  (isOwnProfile ? user?.user_metadata?.avatar_url : null) ||
                  DEFAULT_AVATAR
                }
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-around ml-4">
            <StatItem count={posts.length} label={t('profile.posts')} />
            <button onClick={() => setShowFollowersModal(true)} className="text-center">
              <StatItem count={profile?.followers_count || 0} label={t('common.followers')} />
            </button>
            <button onClick={() => setShowFollowingModal(true)} className="text-center">
              <StatItem count={profile?.following_count || 0} label={t('common.following')} />
            </button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4">
          <h2 className="font-bold text-sm">
            {profile?.full_name ||
              (isOwnProfile ? user?.user_metadata?.full_name : null) ||
              t('profile.noName')}
          </h2>
          <span className="text-xs text-gray-500 block mb-1">
            @{profile?.username || 'username'}
          </span>
          <p className="text-sm whitespace-pre-line">
            {profile?.website || t('profile.musicIsLife')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {t('profile.editProfile')}
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title={t('profile.settings', 'Settings')}
              >
                <Settings size={18} />
              </button>
              <button
                onClick={signOut}
                className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-red-500"
                title={t('profile.signOut')}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              {/* Instagram-style Follow button with dropdown */}
              <FollowButton
                userId={targetUserId!}
                size="md"
                className="flex-1"
                showDropdown
                onFollowChange={(isFollowing) => {
                  setProfile((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      followers_count: Math.max(
                        0,
                        (prev.followers_count || 0) + (isFollowing ? 1 : -1)
                      ),
                    };
                  });
                }}
              />
              {/* Message button */}
              <button
                onClick={startConversation}
                disabled={startingConversation}
                className="flex-1 bg-gray-100 dark:bg-gray-800 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center disabled:opacity-50"
              >
                {t('profile.message')}
              </button>
              {/* User suggestion button */}
              <button
                className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title={t('profile.suggestedUsers', 'Suggested users')}
              >
                <UserPlus size={18} />
              </button>
            </>
          )}
        </div>

        {/* Story Highlights Section - Instagram style */}
        <div className="mt-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2">
            {/* Add New Highlight button (only for own profile) */}
            {isOwnProfile && (
              <div className="flex flex-col items-center flex-shrink-0">
                <button className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-gray-400 dark:hover:border-gray-500 transition">
                  <Plus size={24} className="text-gray-400" />
                </button>
                <span className="text-xs mt-1 text-gray-600 dark:text-gray-400 truncate w-16 text-center">
                  {t('profile.new')}
                </span>
              </div>
            )}
            {/* Highlight items - Show user's playlists as highlights */}
            {playlists.slice(0, 8).map((playlist) => (
              <button
                type="button"
                key={playlist.id}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                onClick={() => playlist.video_id && handlePlayPlaylist(playlist)}
                disabled={!playlist.video_id}
              >
                <div className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-600 p-0.5">
                  <img
                    src={
                      playlist.cover_url ||
                      (playlist.video_id
                        ? `https://i.ytimg.com/vi/${playlist.video_id}/default.jpg`
                        : 'https://via.placeholder.com/64')
                    }
                    alt={playlist.title || t('profile.playlist')}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <span className="text-xs mt-1 text-gray-800 dark:text-gray-200 truncate w-16 text-center">
                  {playlist.title?.slice(0, 10) || t('profile.playlist')}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'posts' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
        >
          <Grid size={24} />
        </button>
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'liked' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Heart size={24} />
          </button>
        )}
        {isOwnProfile ? (
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'discover' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Disc size={24} />
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('music')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'music' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Music size={24} />
          </button>
        )}
        {isOwnProfile && (
          <button
            onClick={() => setActiveTab('private')}
            className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'private' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}
          >
            <Lock size={24} />
          </button>
        )}
      </div>

      {/* Content Area */}
      {activeTab === 'liked' ? (
        <LikedMusicTab
          likedSongs={likedSongs}
          recommendedTracks={recommendedTracks}
          recommendationContext={recommendationContext}
          currentTrackVideoId={currentTrack?.videoId}
          isPlaying={isPlaying}
          onPlayTrack={handlePlayTrack}
          onDeleteSong={handleDeleteSong}
          onShufflePlay={handleShufflePlay}
          onPlayRecommendedTrack={handlePlayRecommendedTrack}
          onClearRecommendations={() => setRecommendedTracks([])}
          t={t}
        />
      ) : activeTab === 'posts' ? (
        // Posts Grid Tab
        <PostsGrid
          posts={posts}
          currentTrackVideoId={currentTrack?.videoId}
          isPlaying={isPlaying}
          onPlayPost={handlePlayPost}
          t={t}
        />
      ) : activeTab === 'discover' ? (
        // Discover Tab - YouTube Music Home Feed
        <DiscoverTab
          homeData={homeData}
          homeLoading={homeLoading}
          onPlayHomeItem={handlePlayHomeItem}
          t={t}
        />
      ) : activeTab === 'music' ? (
        // Artist Music Tab (for virtual members) or Saved Music Tab
        <div className="p-4">
          {isVirtualMember ? (
            // Virtual Member: Show artist's music from search
            <ArtistMusicTab
              artistMusicLoading={artistMusicLoading}
              artistSongs={artistSongs}
              artistAlbums={artistAlbums}
              artistVideos={artistVideos}
              similarArtists={similarArtists}
              showAllSongs={showAllSongs}
              showAllAlbums={showAllAlbums}
              onToggleShowAllSongs={() => setShowAllSongs(!showAllSongs)}
              onToggleShowAllAlbums={() => setShowAllAlbums(!showAllAlbums)}
              onPlaySong={handleArtistPlaySong}
              onShufflePlay={handleArtistShufflePlay}
              onPlayVideo={handleArtistPlayVideo}
              onShowAlbum={fetchAndShowAlbum}
              onNavigateToArtist={(artistName) =>
                navigate(`/search?q=${encodeURIComponent(artistName)}`)
              }
              profileName={profile?.full_name}
              t={t}
            />
          ) : (
            <UserSavedMusicTab
              userSavedSongs={userSavedSongs}
              currentTrackVideoId={currentTrack?.videoId}
              isPlaying={isPlaying}
              onPlayTrack={handleUserSavedPlayTrack}
              onShufflePlay={handleUserSavedShufflePlay}
              t={t}
            />
          )}
        </div>
      ) : (
        // Private Tab
        <PrivateTab t={t} />
      )}

      {/* Followers/Following Modals */}
      {profile?.id && (
        <>
          <FollowersModal
            userId={profile.id}
            type="followers"
            isOpen={showFollowersModal}
            onClose={() => setShowFollowersModal(false)}
          />
          <FollowersModal
            userId={profile.id}
            type="following"
            isOpen={showFollowingModal}
            onClose={() => setShowFollowingModal(false)}
          />
        </>
      )}
    </div>
  );
}
