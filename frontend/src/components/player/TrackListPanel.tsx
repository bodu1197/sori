import { Play, Shuffle, X, ChevronRight } from 'lucide-react';

interface PlaylistTrack {
  videoId: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  duration?: string;
  album?: { name?: string; id?: string };
  isAvailable?: boolean;
}

interface PlaylistData {
  title: string;
  description?: string;
  author?: { name: string };
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  tracks: PlaylistTrack[];
  trackCount?: number;
}

interface TrackListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistData | null;
  loading: boolean;
  onPlayTrack: (track: PlaylistTrack, index: number, allTracks: PlaylistTrack[]) => void;
  onPlayAll: () => void;
  onShuffleAll: () => void;
  currentVideoId?: string;
  isPlaying: boolean;
}

function getBestThumbnail(
  thumbnails?: Array<{ url: string; width?: number; height?: number }>
): string | null {
  if (!thumbnails || thumbnails.length === 0) return null;
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
}

export default function TrackListPanel({
  isOpen,
  onClose,
  playlist,
  loading,
  onPlayTrack,
  onPlayAll,
  onShuffleAll,
  currentVideoId,
  isPlaying,
}: TrackListPanelProps) {
  // Find current playing track info
  const currentTrackInfo = playlist?.tracks.find((t) => t.videoId === currentVideoId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl h-[100dvh] overflow-hidden animate-slide-up">
        {/* YouTube Video Player - YouTube iframe API compliance */}
        {currentVideoId && (
          <div className="w-full bg-black">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {/* Current Track Info */}
            {currentTrackInfo && (
              <div className="px-4 py-2 bg-gray-900 text-white">
                <div className="font-medium text-sm truncate">{currentTrackInfo.title}</div>
                <div className="text-xs text-gray-400 truncate">
                  {currentTrackInfo.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {playlist?.thumbnails && (
                <img
                  src={getBestThumbnail(playlist.thumbnails) || 'https://via.placeholder.com/48'}
                  alt={playlist?.title || 'Playlist'}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate">{playlist?.title || 'Loading...'}</h3>
                <p className="text-sm text-gray-500 truncate">
                  {playlist?.author?.name || ''}{' '}
                  {playlist?.trackCount ? `${playlist.trackCount} tracks` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X size={24} />
            </button>
          </div>

          {/* Play Controls */}
          {playlist && playlist.tracks.length > 0 && (
            <div className="flex gap-2 px-4 pb-3">
              <button
                onClick={onPlayAll}
                className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-full font-semibold hover:opacity-80 transition"
              >
                <Play size={18} fill="currentColor" /> Play All
              </button>
              <button
                onClick={onShuffleAll}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 py-2.5 rounded-full font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <Shuffle size={18} /> Shuffle
              </button>
            </div>
          )}
        </div>

        {/* Track List */}
        <div
          className="overflow-y-auto flex-1"
          style={{ maxHeight: currentVideoId ? 'calc(100dvh - 380px)' : 'calc(100dvh - 160px)' }}
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
            </div>
          ) : playlist && playlist.tracks.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 pb-[120px]">
              {playlist.tracks.map((track, index) => {
                const isCurrentTrack = currentVideoId === track.videoId;
                const isTrackPlaying = isCurrentTrack && isPlaying;

                return (
                  <div
                    key={track.videoId || index}
                    onClick={() => track.videoId && onPlayTrack(track, index, playlist.tracks)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      isCurrentTrack
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${!track.videoId || track.isAvailable === false ? 'opacity-50' : ''}`}
                  >
                    {/* Index / Playing Indicator */}
                    <div className="w-6 flex-shrink-0 text-center">
                      {isTrackPlaying ? (
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
                        <span className="text-sm text-gray-400">{index + 1}</span>
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className="w-10 h-10 flex-shrink-0">
                      <img
                        src={getBestThumbnail(track.thumbnails) || 'https://via.placeholder.com/40'}
                        alt={track.title}
                        className="w-full h-full rounded object-cover"
                      />
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium text-sm truncate ${isCurrentTrack ? 'text-black dark:text-white' : ''}`}
                      >
                        {track.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {track.duration || ''}
                    </div>

                    {/* Play Button */}
                    <button className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500">No tracks available</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export type { PlaylistTrack, PlaylistData, TrackListPanelProps };
