import { useState, useEffect } from 'react';
import { Play, Zap } from 'lucide-react';
import { ShortsPlayer } from './ShortsPlayer';
import useCountry from '../../hooks/useCountry';

// Fallback data in case API fails or returns no shorts
const FALLBACK_SHORTS = [
  {
    videoId: 'shW_XRBQx6k',
    title: "NewJeans (뉴진스) 'Super Shy' Dance Practice",
    artist: 'NewJeans',
  },
  { videoId: 'tH1TygXbF6E', title: 'JUNGKOOK - Seven (feat. Latto) #Shorts', artist: 'BANGTANTV' },
  {
    videoId: 'C7-12b7sps0',
    title: "LE SSERAFIM (르세라핌) 'Eve, Psyche & The Bluebeard's wife'",
    artist: 'HYBE LABELS',
  },
  { videoId: '9bZkp7q19f0', title: 'Gangnam Style - PSY #Shorts', artist: 'officialpsy' },
  { videoId: 'k3wA6yJ4q_U', title: 'BLACKPINK - ‘Shut Down’ M/V Teaser', artist: 'BLACKPINK' },
];

const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

export default function ShortsRail() {
  const [shorts, setShorts] = useState<any[]>([]);
  // Changed state to hold viewer properties
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    startIndex: number;
    videos: any[];
  }>({
    isOpen: false,
    startIndex: 0,
    videos: [],
  });
  const [loading, setLoading] = useState(true);
  const country = useCountry();

  useEffect(() => {
    async function fetchShorts() {
      if (!country.code) return;

      try {
        setLoading(true);
        // Search for "#shorts music" + country logic if needed
        const query = encodeURIComponent('#shorts music trend');
        const response = await fetch(
          `${API_BASE_URL}/api/search?q=${query}&filter=videos&country=${country.code}`
        );

        if (response.ok) {
          const data = await response.json();
          let results = data.results || data || [];

          if (results.length < 5) {
            results = [...results, ...FALLBACK_SHORTS];
          }

          const formatted = results
            .map((item: any) => ({
              videoId: item.videoId,
              title: item.title,
              artist: item.artists?.[0]?.name || item.artist || 'Unknown',
              thumbnail:
                item.thumbnails?.[item.thumbnails?.length - 1]?.url ||
                `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            }))
            .slice(0, 10);

          setShorts(formatted);
        } else {
          setShorts(FALLBACK_SHORTS);
        }
      } catch (err) {
        console.error('Failed to fetch shorts', err);
        setShorts(FALLBACK_SHORTS);
      } finally {
        setLoading(false);
      }
    }

    fetchShorts();
  }, [country.code]);

  if (!loading && shorts.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="px-4 mb-3 flex items-center gap-2">
        <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <Zap size={18} className="text-red-600 dark:text-red-500 fill-current" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">
            Trending Shorts
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Most popular music clips right now
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[140px] aspect-[9/16] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse"
              />
            ))
          : shorts.map((video, index) => (
              <button
                key={video.videoId}
                onClick={() => setViewerState({ isOpen: true, startIndex: index, videos: shorts })}
                className="relative flex-shrink-0 w-[140px] aspect-[9/16] rounded-xl overflow-hidden snap-start group shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

                {/* Text Info */}
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <p className="text-white text-xs font-bold line-clamp-2 leading-tight drop-shadow-sm mb-1">
                    {video.title}
                  </p>
                  <p className="text-white/80 text-[10px] truncate font-medium">{video.artist}</p>
                </div>

                {/* Play Icon (appears on hover) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[1px]">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <Play className="text-white fill-white ml-0.5" size={20} />
                  </div>
                </div>

                {/* Shorts Logo/Badge */}
                <div className="absolute top-2 right-2 p-1 bg-black/40 backdrop-blur-sm rounded-md">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17.77 10.3202L12.3397 7.17C11.6697 6.79 11.4397 5.94 11.8097 5.28C12.1897 4.61 13.0297 4.38 13.6997 4.76L19.1297 7.9101C19.7997 8.2901 20.0297 9.1401 19.6597 9.8001C19.3497 10.3501 18.7897 10.6302 18.2397 10.6302C18.0797 10.6302 17.9197 10.6001 17.7697 10.5101L17.77 10.3202ZM10.2897 13.6702L5.8097 11.0701L10.2997 13.6702ZM11.6597 16.8202L6.2297 13.6702C5.5597 13.2902 5.3297 12.44 5.6997 11.78C6.0797 11.11 6.9197 10.88 7.5897 11.26L13.0197 14.4101C13.6897 14.7901 13.9197 15.64 13.5497 16.3C13.2397 16.85 12.6797 17.1302 12.1297 17.1302C11.9697 17.1302 11.8097 17.1001 11.6597 17.0101V16.8202ZM20.7697 6.5501L15.3397 3.4001C14.0097 2.6301 12.3097 3.08 11.5397 4.41L11.0897 5.19C10.1497 4.91 9.1097 5.15 8.3597 5.86L8.3297 5.84009C7.8897 5.58009 7.3297 5.73 7.0797 6.17C6.8297 6.61 6.9797 7.1701 7.4197 7.4201L11.7797 9.9501L11.5397 10.3602C10.7697 11.6902 9.0697 12.1401 7.7397 11.3701L2.3097 8.2201C1.5997 7.8101 0.819702 7.73 0.169702 8.01C-0.120298 8.44 -0.0102982 9.0601 0.129702 9.3201L0.669702 10.2602C0.849702 10.5802 0.879702 10.9602 0.739702 11.3002C0.599702 11.6402 0.319702 11.9102 -0.0502982 12.0402C0.669702 13.2902 2.3697 15.5401 3.6997 16.3101L9.1297 19.4601C10.4597 20.2301 12.1597 19.7801 12.9297 18.4501L13.3797 17.6702C14.3197 17.9502 15.3597 17.71 16.1097 17L16.1397 17.0201C16.5797 17.2801 17.1397 17.1302 17.3997 16.6902C17.6497 16.2502 17.4997 15.6901 17.0597 15.4301L12.6997 12.9001L12.9397 12.4901C13.7097 11.1601 15.4097 10.7101 16.7397 11.4801L22.1697 14.6302C22.8897 15.0402 23.6697 15.1201 24.3197 14.8401C24.4797 14.6101 24.5097 14.1501 24.3497 13.5301L23.8097 12.5901C23.6297 12.2701 23.5997 11.8901 23.7397 11.5501C23.8797 11.2101 24.1597 10.9401 24.5297 10.8101C23.8097 9.5601 22.0997 7.3201 20.7697 6.5501Z"
                      fill="white"
                    />
                  </svg>
                </div>
              </button>
            ))}
      </div>

      {viewerState.isOpen && (
        <ShortsPlayer
          initialIndex={viewerState.startIndex}
          shorts={viewerState.videos}
          onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
