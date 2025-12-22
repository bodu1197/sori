import { useEffect, useState, SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import useCountry from '../hooks/useCountry';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import { Play, Loader2 } from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://musicgram-api-89748215794.us-central1.run.app';

interface Artist {
  name: string;
  id?: string;
}

interface ChartTrack {
  videoId?: string;
  video_id?: string;
  title: string;
  artist?: string;
  artists?: Artist[];
  thumbnail?: string;
  cover?: string;
}

export default function ChartsPage() {
  const { t } = useTranslation();
  const country = useCountry();
  const { startPlayback, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();
  const [chartData, setChartData] = useState<ChartTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCharts() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/charts?country=${country.code}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch charts: ${response.status}`);
        }

        const data = await response.json();
        setChartData(data.results || data.charts || data || []);
      } catch {
        setError(t('charts.loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchCharts();
  }, [country.code]);

  const handlePlay = (track: ChartTrack, index: number) => {
    if (!track.videoId && !track.video_id) return;

    // Open popup with chart tracks
    const panelTracks: PlaylistTrackData[] = chartData
      .filter((t) => t.videoId || t.video_id)
      .map((t) => ({
        videoId: (t.videoId || t.video_id) as string,
        title: t.title,
        artists: t.artists || (t.artist ? [{ name: t.artist }] : [{ name: 'Unknown Artist' }]),
        thumbnails:
          t.thumbnail || t.cover ? [{ url: (t.thumbnail || t.cover) as string }] : undefined,
      }));
    openTrackPanel({
      title: `${t('charts.top100')} - ${country.name}`,
      author: { name: `${chartData.length} ${t('profile.tracks')}` },
      tracks: panelTracks,
      trackCount: chartData.length,
    });

    // Start playback
    const tracks = chartData
      .filter((t) => t.videoId || t.video_id)
      .map((t) => ({
        videoId: (t.videoId || t.video_id) as string,
        title: t.title,
        artist: t.artist || t.artists?.[0]?.name || 'Unknown Artist',
        thumbnail: t.thumbnail || t.cover,
        cover: t.cover || t.thumbnail,
      }));
    startPlayback(tracks, index);
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6">
        <h1 className="text-2xl font-bold mb-1 text-black dark:text-white">{t('charts.top100')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 flex items-center">
          {t('charts.basedOn', { country: country.name })} {country.flag}
        </p>
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-20 px-4 pt-6">
        <h1 className="text-2xl font-bold mb-1 text-black dark:text-white">{t('charts.top100')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 flex items-center">
          {t('charts.basedOn', { country: country.name })} {country.flag}
        </p>
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium"
          >
            {t('charts.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-1 text-black dark:text-white">{t('charts.top100')}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 flex items-center">
        {t('charts.basedOn', { country: country.name })} {country.flag}
      </p>

      {chartData.length > 0 ? (
        <div className="space-y-4">
          {chartData.map((track, index) => {
            const rank = index + 1;
            const isCurrentlyPlaying =
              currentTrack?.videoId === (track.videoId || track.video_id) && isPlaying;

            return (
              <div
                key={track.videoId || track.video_id || index}
                onClick={() => handlePlay(track, index)}
                className="flex items-center gap-4 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg p-2 transition"
              >
                <span
                  className={`text-lg font-bold w-6 text-center ${rank <= 3 ? 'text-black dark:text-white' : 'text-gray-400'}`}
                >
                  {rank}
                </span>
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img
                    src={track.thumbnail || track.cover}
                    alt={track.title}
                    className="w-full h-full rounded-md object-cover"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
                    }}
                  />
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-md transition-opacity ${
                      isCurrentlyPlaying
                        ? 'bg-black/40 opacity-100'
                        : 'bg-black/20 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isCurrentlyPlaying ? (
                      <div className="flex gap-0.5">
                        <div
                          className="w-0.5 h-4 bg-white animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        ></div>
                        <div
                          className="w-0.5 h-4 bg-white animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        ></div>
                        <div
                          className="w-0.5 h-4 bg-white animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        ></div>
                      </div>
                    ) : (
                      <Play size={16} fill="white" className="text-white" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold truncate text-black dark:text-white">
                    {track.title}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {track.artist || track.artists?.[0]?.name || 'Unknown Artist'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p>{t('charts.noCharts')}</p>
        </div>
      )}
    </div>
  );
}
