import { MouseEvent } from 'react';
import { Heart } from 'lucide-react';

interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface Artist {
  name: string;
  id?: string;
}

interface Album {
  name?: string;
  id?: string;
}

interface SearchSong {
  videoId: string;
  title: string;
  artists?: Artist[];
  album?: Album;
  thumbnails?: Thumbnail[];
  duration?: string;
}

interface TrackItemProps {
  readonly track: SearchSong;
  readonly index: number;
  readonly isLiked: boolean;
  readonly onPlay: () => void;
  readonly onToggleLike: (e: MouseEvent<HTMLButtonElement>) => void;
  readonly getBestThumbnail: (thumbnails?: Thumbnail[]) => string;
}

export default function TrackItem({
  track,
  index,
  isLiked,
  onPlay,
  onToggleLike,
  getBestThumbnail,
}: TrackItemProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPlay();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
    >
      <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
      <img
        src={getBestThumbnail(track.thumbnails)}
        alt={track.title}
        className="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-gray-700"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-black dark:text-white truncate">{track.title}</div>
        <div className="text-xs text-gray-500 truncate">
          {track.artists?.[0]?.name}
          {track.album?.name && ` - ${track.album.name}`}
        </div>
      </div>
      <span className="text-xs text-gray-400">{track.duration}</span>
      <button
        type="button"
        onClick={onToggleLike}
        className={`p-1.5 ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        aria-label={isLiked ? 'Unlike' : 'Like'}
      >
        <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
