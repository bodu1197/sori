/**
 * Profile Page Helper Components
 * Extracted from ProfilePage.tsx to reduce cognitive complexity
 */
/* eslint-disable react-refresh/only-export-components */
import { useTranslation } from 'react-i18next';
import { Music, Grid, Heart, Shuffle } from 'lucide-react';

// Types
interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface ArtistSong {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  album?: { name: string; id?: string };
  thumbnails?: Thumbnail[];
  duration?: string;
}

interface ArtistAlbum {
  browseId?: string;
  title: string;
  type?: string;
  year?: string;
  thumbnails?: Thumbnail[];
}

interface SimilarArtist {
  browseId: string;
  artist: string;
  thumbnails?: Thumbnail[];
}

// Helper function
export function getBestThumbnail(thumbnails?: Thumbnail[]): string | null {
  if (!thumbnails || thumbnails.length === 0) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
}

// Section Header Component
interface SectionHeaderProps {
  readonly title: string;
  readonly count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <h3 className="font-bold text-lg mb-3">
      {title} {count !== undefined && `(${count})`}
    </h3>
  );
}

// Artist Song List Component
interface ArtistSongListProps {
  readonly songs: ArtistSong[];
  readonly showAll: boolean;
  readonly onToggleShowAll: () => void;
  readonly onPlaySong: (song: ArtistSong, index: number, allSongs: ArtistSong[]) => void;
  readonly currentVideoId?: string;
  readonly isPlaying: boolean;
}

export function ArtistSongList({
  songs,
  showAll,
  onToggleShowAll,
  onPlaySong,
  currentVideoId: _currentVideoId,
  isPlaying: _isPlaying,
}: ArtistSongListProps) {
  const { t } = useTranslation();
  const displayedSongs = showAll ? songs : songs.slice(0, 5);

  return (
    <div>
      <SectionHeader title={t('search.topSongs', 'Top Songs')} count={songs.length} />
      <div className="space-y-1">
        {displayedSongs.map((song, index) => (
          <button
            type="button"
            key={song.videoId || index}
            onClick={() => onPlaySong(song, index, displayedSongs)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition w-full text-left"
          >
            <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
            <img
              src={song.thumbnails?.[0]?.url || 'https://via.placeholder.com/40'}
              alt={song.title}
              className="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-gray-700"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{song.title}</div>
              <div className="text-xs text-gray-500 truncate">
                {song.artists?.[0]?.name}
                {song.album?.name && ` • ${song.album.name}`}
              </div>
            </div>
            <span className="text-xs text-gray-400">{song.duration}</span>
          </button>
        ))}
      </div>
      {songs.length > 5 && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
        >
          {showAll
            ? t('search.showLess', 'Show Less')
            : `${t('search.showMore', 'Show More')} (${songs.length - 5})`}
        </button>
      )}
    </div>
  );
}

// Artist Album List Component
interface ArtistAlbumListProps {
  readonly albums: ArtistAlbum[];
  readonly showAll: boolean;
  readonly onToggleShowAll: () => void;
  readonly onClickAlbum: (browseId: string) => void;
}

export function ArtistAlbumList({
  albums,
  showAll,
  onToggleShowAll,
  onClickAlbum,
}: ArtistAlbumListProps) {
  const { t } = useTranslation();
  const displayedAlbums = showAll ? albums : albums.slice(0, 4);

  return (
    <div>
      <SectionHeader
        title={t('search.albumsAndSingles', 'Albums & Singles')}
        count={albums.length}
      />
      <div className="space-y-3">
        {displayedAlbums.map((album, index) => (
          <button
            type="button"
            key={album.browseId || index}
            onClick={() => album.browseId && onClickAlbum(album.browseId)}
            className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition w-full text-left"
          >
            <img
              src={album.thumbnails?.[0]?.url || 'https://via.placeholder.com/80'}
              alt={album.title}
              className="w-20 h-20 rounded-lg object-cover bg-gray-200 dark:bg-gray-700"
            />
            <div className="flex-1 min-w-0 py-1">
              <div className="font-semibold text-sm truncate">{album.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                {album.type || 'Album'} {album.year && `• ${album.year}`}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {t('search.clickToViewTracks', 'Click to view tracks')}
              </div>
            </div>
          </button>
        ))}
      </div>
      {albums.length > 4 && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="w-full mt-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
        >
          {showAll
            ? t('search.showLess', 'Show Less')
            : `${t('search.showMore', 'Show More')} (${albums.length - 4})`}
        </button>
      )}
    </div>
  );
}

// Similar Artists Grid Component
interface SimilarArtistsGridProps {
  readonly artists: SimilarArtist[];
  readonly onClickArtist: (browseId: string) => void;
}

export function SimilarArtistsGrid({ artists, onClickArtist }: SimilarArtistsGridProps) {
  const { t } = useTranslation();

  return (
    <div>
      <SectionHeader title={t('search.similarArtists', 'Similar Artists')} count={artists.length} />
      <div className="grid grid-cols-3 gap-3">
        {artists.slice(0, 6).map((artist, index) => (
          <button
            type="button"
            key={artist.browseId || index}
            onClick={() => onClickArtist(artist.browseId)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <img
              src={artist.thumbnails?.[0]?.url || 'https://via.placeholder.com/80'}
              alt={artist.artist}
              className="w-16 h-16 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
            />
            <span className="text-xs font-medium text-center truncate w-full">{artist.artist}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Profile Tabs Component
interface ProfileTabsProps {
  readonly activeTab: string;
  readonly onTabChange: (tab: 'posts' | 'liked' | 'discover' | 'private' | 'music') => void;
  readonly isOwnProfile: boolean;
  readonly isVirtualMember: boolean;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  isOwnProfile,
  isVirtualMember,
}: ProfileTabsProps) {
  const { t } = useTranslation();

  // Define tabs based on profile type
  const getProfileTabs = () => {
    if (isVirtualMember) {
      return [
        { key: 'music' as const, icon: Music, label: t('profile.music', 'Music') },
        { key: 'posts' as const, icon: Grid, label: t('profile.posts') },
      ];
    }
    if (isOwnProfile) {
      return [
        { key: 'discover' as const, icon: Grid, label: t('profile.discover', 'Discover') },
        { key: 'liked' as const, icon: Heart, label: t('profile.yourMusic', 'Your Music') },
        { key: 'posts' as const, icon: Grid, label: t('profile.myPosts', 'Posts') },
      ];
    }
    return [
      { key: 'music' as const, icon: Music, label: t('profile.music', 'Music') },
      { key: 'posts' as const, icon: Grid, label: t('profile.posts') },
    ];
  };
  const tabs = getProfileTabs();

  return (
    <div className="flex justify-around border-y border-gray-200 dark:border-gray-800 py-2">
      {tabs.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onTabChange(key)}
          className={`flex flex-col items-center gap-1 py-1 px-4 ${
            activeTab === key
              ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
              : 'text-gray-400'
          }`}
        >
          <Icon size={20} />
          <span className="text-xs">{label}</span>
        </button>
      ))}
    </div>
  );
}

// Music Controls Component (Shuffle button)
interface MusicControlsProps {
  readonly songsCount: number;
  readonly onShufflePlay: () => void;
}

export function MusicControls({ songsCount, onShufflePlay }: MusicControlsProps) {
  const { t } = useTranslation();

  if (songsCount === 0) return null;

  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold">{t('profile.yourMusic')}</h3>
      <button
        type="button"
        onClick={onShufflePlay}
        className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition"
      >
        <Shuffle size={16} />
        {t('profile.shuffleAll')}
      </button>
    </div>
  );
}
