// @ts-nocheck
import React from 'react';
import useCountry from '../hooks/useCountry';
import { Play } from 'lucide-react';

// Mock Data for Charts
const MOCK_CHARTS = {
  KR: [
    {
      rank: 1,
      title: 'Ditto',
      artist: 'NewJeans',
      cover: 'https://i.scdn.co/image/ab67616d0000b2733d98a0da7c77436da516152d',
    },
    {
      rank: 2,
      title: 'Hype Boy',
      artist: 'NewJeans',
      cover: 'https://i.scdn.co/image/ab67616d0000b2733d98a0da7c77436da516152d',
    },
    {
      rank: 3,
      title: 'Seven',
      artist: 'Jungkook',
      cover: 'https://i.scdn.co/image/ab67616d0000b2731855a987d60f47e3037be3d3',
    },
  ],
  US: [
    {
      rank: 1,
      title: 'Vampire',
      artist: 'Olivia Rodrigo',
      cover: 'https://i.scdn.co/image/ab67616d0000b273e85259a1cae29a8d91f2093d',
    },
    {
      rank: 2,
      title: 'Paint The Town Red',
      artist: 'Doja Cat',
      cover: 'https://i.scdn.co/image/ab67616d0000b27376c6c561492ba68e22c45389',
    },
    {
      rank: 3,
      title: 'Cruel Summer',
      artist: 'Taylor Swift',
      cover: 'https://i.scdn.co/image/ab67616d0000b27387a7631842eb5cc8211db3e8',
    },
  ],
  JP: [
    {
      rank: 1,
      title: 'Idol',
      artist: 'YOASOBI',
      cover: 'https://i.scdn.co/image/ab67616d0000b273b7d685491ebfb6c5c069b0fa',
    },
    {
      rank: 2,
      title: 'KICK BACK',
      artist: 'Kenshi Yonezu',
      cover: 'https://i.scdn.co/image/ab67616d0000b273c52e1e07353995f543ad4f33',
    },
  ],
  GB: [
    {
      rank: 1,
      title: 'Sprinter',
      artist: 'Dave & Central Cee',
      cover: 'https://i.scdn.co/image/ab67616d0000b273d42fb59104082260714b2d18',
    },
  ],
};

export default function ChartsPage() {
  const country = useCountry();
  const chartData = MOCK_CHARTS[country.code] || MOCK_CHARTS['US'];

  return (
    <div className="pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-1">Top 100 Charts</h1>
      <p className="text-gray-500 mb-6 flex items-center">
        Based on {country.name} {country.flag}
      </p>

      <div className="space-y-4">
        {chartData.map((track) => (
          <div
            key={track.rank}
            className="flex items-center gap-4 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg p-2 transition"
          >
            <span
              className={`text-lg font-bold w-6 text-center ${track.rank <= 3 ? 'text-black dark:text-white' : 'text-gray-400'}`}
            >
              {track.rank}
            </span>
            <div className="relative w-12 h-12 flex-shrink-0">
              <img
                src={track.cover}
                alt={track.title}
                className="w-full h-full rounded-md object-cover"
              />
              <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center rounded-md">
                <Play size={16} fill="white" className="text-white" />
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-semibold truncate">{track.title}</span>
              <span className="text-sm text-gray-500 truncate">{track.artist}</span>
            </div>
          </div>
        ))}

        {/* Filler for demo */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i + 10} className="flex items-center gap-4 p-2 opacity-50">
            <span className="text-lg font-bold w-6 text-center text-gray-300">{i + 4}</span>
            <div className="w-12 h-12 bg-gray-200 rounded-md"></div>
            <div className="flex flex-col gap-1 w-3/4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
