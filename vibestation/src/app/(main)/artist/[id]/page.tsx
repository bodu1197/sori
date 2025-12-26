'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Shuffle, UserPlus, Music2, ArrowLeft } from 'lucide-react';

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

// Mock artist data
const mockArtist = {
  name: 'aespa',
  subscribers: '25M subscribers',
  description: 'aespa is a South Korean girl group formed by SM Entertainment. The group consists of four members: Karina, Giselle, Winter, and Ningning.',
  imageUrl: 'https://yt3.googleusercontent.com/cm8QQWLV4_y3aJJmFWCTYWnMb_1FjIpFVMsYwAXJVPTKsNLADmY8oYhBFQr0pNtMy8QVxTw9sQ=s176-c-k-c0x00ffffff-no-rj',
  songs: [
    { id: '1', title: 'Whiplash', duration: '3:24', plays: '87M' },
    { id: '2', title: 'Supernova', duration: '3:15', plays: '120M' },
    { id: '3', title: 'Drama', duration: '3:42', plays: '95M' },
    { id: '4', title: 'Next Level', duration: '3:37', plays: '450M' },
    { id: '5', title: 'Savage', duration: '3:59', plays: '380M' },
  ],
};

export default function ArtistPage({ params }: ArtistPageProps) {
  const { id } = use(params);
  const artist = mockArtist;

  // For now, just display mock data
  console.log('Artist ID:', id);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Back Button */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Artist Header */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
        <div className="relative h-48 w-48 rounded-full overflow-hidden bg-zinc-800 shrink-0 ring-4 ring-purple-500/20">
          <Image
            src={artist.imageUrl}
            alt={artist.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold">{artist.name}</h1>
          <p className="text-zinc-400">{artist.subscribers}</p>
          <p className="text-sm text-zinc-500 mt-2 max-w-2xl line-clamp-3">
            {artist.description}
          </p>
          <div className="flex gap-3 mt-4 justify-center md:justify-start">
            <button className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors">
              <Play className="h-4 w-4" fill="white" />
              Play
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium transition-colors">
              <Shuffle className="h-4 w-4" />
              Shuffle
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium transition-colors">
              <UserPlus className="h-4 w-4" />
              Follow
            </button>
          </div>
        </div>
      </div>

      {/* Top Songs */}
      <section className="bg-zinc-900 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <Music2 className="h-5 w-5 text-purple-400" />
          Top Songs
        </h2>
        <div className="space-y-2">
          {artist.songs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors group cursor-pointer"
            >
              <span className="w-6 text-center text-zinc-500 font-medium">
                {index + 1}
              </span>
              <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <Music2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{song.title}</p>
                <p className="text-sm text-zinc-400">{artist.name}</p>
              </div>
              <span className="text-sm text-zinc-500 hidden md:block">{song.plays}</span>
              <span className="text-sm text-zinc-500">{song.duration}</span>
              <button className="p-2 rounded-full bg-purple-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-4 w-4" fill="white" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Coming Soon Notice */}
      <div className="text-center py-8 text-zinc-500">
        <p>Full artist data integration coming soon!</p>
        <p className="text-sm">Connect to YouTube Music API for complete artist info.</p>
      </div>
    </div>
  );
}
