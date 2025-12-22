import { SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Shuffle, Heart } from 'lucide-react';

interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

interface SearchArtist {
  artist: string;
  browseId?: string;
  subscribers?: string;
  thumbnails?: Thumbnail[];
  songsPlaylistId?: string;
}

interface ArtistCardProps {
  readonly artist: SearchArtist;
  readonly onPlayAll: () => void;
  readonly onShuffle: () => void;
  readonly getBestThumbnail: (thumbnails?: Thumbnail[]) => string;
  readonly placeholder: string;
}

export default function ArtistCard({
  artist,
  onPlayAll,
  onShuffle,
  getBestThumbnail,
  placeholder,
}: ArtistCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-700">
          <img
            src={getBestThumbnail(artist.thumbnails)}
            alt={artist.artist}
            className="w-full h-full object-cover"
            onError={(e: SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = placeholder;
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-black dark:text-white truncate">{artist.artist}</h2>
          <p className="text-sm text-gray-500">{artist.subscribers || 'Artist'}</p>
        </div>
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-red-500 transition"
          aria-label="Like artist"
        >
          <Heart size={24} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={onPlayAll}
          className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition"
        >
          <Play size={16} fill="currentColor" /> {t('player.playAll')}
        </button>
        <button
          type="button"
          onClick={onShuffle}
          className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition text-black dark:text-white"
        >
          <Shuffle size={16} /> {t('player.shufflePlay')}
        </button>
      </div>
    </div>
  );
}
