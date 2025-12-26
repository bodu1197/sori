import { Loader2, Play, TrendingUp, Users, Video } from 'lucide-react';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useCountry from '../hooks/useCountry';
import usePlayerStore, { PlaylistTrackData } from '../stores/usePlayerStore';
import { getCharts, type MusicItem } from '../lib/musicApi';

const UNKNOWN_ARTIST = 'Unknown Artist';

type TabType = 'trending' | 'videos' | 'artists';

export default function ChartsPage() {
  const { t } = useTranslation();
  const country = useCountry();
  const { startPlayback, currentTrack, isPlaying, openTrackPanel } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<TabType>('trending');

  // Constants to avoid duplicate strings
  const TOP_100_LABEL = t('charts.top100');
  const BASED_ON_LABEL = t('charts.basedOn', { country: country.name });
  const [charts, setCharts] = useState<{
    videos: MusicItem[];
    artists: MusicItem[];
    trending: MusicItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCharts() {
      try {
        setLoading(true);
        setError(null);

        const data = await getCharts(country.code);

        if (data.success) {
          setCharts(data.charts);
        } else {
          throw new Error('Failed to fetch charts');
        }
      } catch {
        setError(t('charts.loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchCharts();
  }, [country.code, t]);

  const getCurrentTracks = (): MusicItem[] => {
    if (!charts) return [];
    return charts[activeTab] || [];
  };

  const handlePlay = (track: MusicItem, index: number) => {
    const videoId = track.videoId;
    if (!videoId) return;

    const currentTracks = getCurrentTracks();

    // Open popup with chart tracks
    const panelTracks: PlaylistTrackData[] = currentTracks
      .filter((t) => t.videoId)
      .map((t) => ({
        videoId: t.videoId as string,
        title: t.title,
        artists: t.artists || [{ name: UNKNOWN_ARTIST, id: '' }],
        thumbnails: t.thumbnails,
      }));

    openTrackPanel({
      title: `${TOP_100_LABEL} - ${country.name}`,
      author: { name: `${currentTracks.length} ${t('profile.tracks')}` },
      tracks: panelTracks,
      trackCount: currentTracks.length,
    });

    // Start playback
    const tracks = currentTracks
      .filter((t) => t.videoId)
      .map((t) => ({
        videoId: t.videoId as string,
        title: t.title,
        artist: t.artists?.[0]?.name || UNKNOWN_ARTIST,
        thumbnail: t.thumbnails?.[0]?.url,
        cover: t.thumbnails?.[0]?.url,
      }));
    startPlayback(tracks, index);
  };

  const tabs: { key: TabType; icon: typeof TrendingUp; label: string }[] = [
    { key: 'trending', icon: TrendingUp, label: t('charts.trending') },
    { key: 'videos', icon: Video, label: t('charts.videos') },
    { key: 'artists', icon: Users, label: t('charts.artists') },
  ];

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6">
        <h1 className="text-2xl font-bold mb-1 text-black dark:text-white">{TOP_100_LABEL}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 flex items-center">
          {BASED_ON_LABEL} {country.flag}
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
        <h1 className="text-2xl font-bold mb-1 text-black dark:text-white">{TOP_100_LABEL}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 flex items-center">
          {BASED_ON_LABEL} {country.flag}
        </p>
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => globalThis.location.reload()}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium"
          >
            {t('charts.retry')}
          </button>
        </div>
      </div>
    );
  }

  const currentTracks = getCurrentTracks();

  return (
    <div className="pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-1 text-black dark:text-white">{TOP_100_LABEL}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-4 flex items-center">
        {BASED_ON_LABEL} {country.flag}
      </p>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {currentTracks.length > 0 ? (
        <div className="space-y-4">
          {currentTracks.map((track, index) => {
            const rank = index + 1;
            const isCurrentlyPlaying = currentTrack?.videoId === track.videoId && isPlaying;
            const thumbnail = track.thumbnails?.[0]?.url;

            return (
              <button
                type="button"
                key={track.videoId || track.browseId || index}
                onClick={() => handlePlay(track, index)}
                className="flex items-center gap-4 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg p-2 transition w-full text-left"
              >
                <span
                  className={`text-lg font-bold w-6 text-center ${rank <= 3 ? 'text-black dark:text-white' : 'text-gray-400'}`}
                >
                  {rank}
                </span>
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img
                    src={thumbnail}
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
                    {track.artists?.[0]?.name || UNKNOWN_ARTIST}
                  </span>
                </div>
              </button>
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
