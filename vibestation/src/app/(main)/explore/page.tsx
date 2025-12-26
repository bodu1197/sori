'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, TrendingUp, Music2, User, Globe, Heart } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { code: 'ZZ', name: 'Global' },
  { code: 'KR', name: 'Korea' },
  { code: 'US', name: 'USA' },
  { code: 'JP', name: 'Japan' },
  { code: 'GB', name: 'UK' },
];

// Placeholder data
const mockSongs = [
  { id: '1', title: 'APT.', artist: 'ROSE & Bruno Mars', plays: '125M', imageUrl: 'https://i.ytimg.com/vi/ekr2nIex040/mqdefault.jpg' },
  { id: '2', title: 'Die With A Smile', artist: 'Lady Gaga, Bruno Mars', plays: '98M', imageUrl: 'https://i.ytimg.com/vi/kPa7bsKwL-c/mqdefault.jpg' },
  { id: '3', title: 'Whiplash', artist: 'aespa', plays: '87M', imageUrl: 'https://i.ytimg.com/vi/jWQx2f-CErU/mqdefault.jpg' },
  { id: '4', title: 'DRIP', artist: 'BABYMONSTER', plays: '76M', imageUrl: 'https://i.ytimg.com/vi/a4KqMXdlVEQ/mqdefault.jpg' },
  { id: '5', title: 'Supernatural', artist: 'NewJeans', plays: '65M', imageUrl: 'https://i.ytimg.com/vi/ZncbtRo7RXs/mqdefault.jpg' },
];

const mockArtists = [
  { id: '1', name: 'aespa', followers: '25M', imageUrl: 'https://yt3.googleusercontent.com/cm8QQWLV4_y3aJJmFWCTYWnMb_1FjIpFVMsYwAXJVPTKsNLADmY8oYhBFQr0pNtMy8QVxTw9sQ=s176-c-k-c0x00ffffff-no-rj' },
  { id: '2', name: 'NewJeans', followers: '20M', imageUrl: 'https://yt3.googleusercontent.com/QGmv5S9DyJXxPcR1GF2sVnvq9uGh_yCqnUqPVAYMbAhxMPvGhZbKu8qmMQvRlJyEJWYBxH8R=s176-c-k-c0x00ffffff-no-rj' },
  { id: '3', name: 'BLACKPINK', followers: '90M', imageUrl: 'https://yt3.googleusercontent.com/MsU3GxEHAz1nNq9RJyVkwvvG0vFjlPXd2bk1Ty3ey0pMnQuCdM0wnD1R_M7xpNpBBqRjGVw9=s176-c-k-c0x00ffffff-no-rj' },
  { id: '4', name: 'BTS', followers: '75M', imageUrl: 'https://yt3.googleusercontent.com/dWaG0YrS6FxJPn_aVrB3LqPr3FWTpWFdNvXN4XVWmFWWrQ3_3HGGQQ0v_W9gNNrjVqEYPNQx=s176-c-k-c0x00ffffff-no-rj' },
  { id: '5', name: 'TWICE', followers: '35M', imageUrl: 'https://yt3.googleusercontent.com/8F1DXDIuMH9iLrxqJwGqQqOAKfF2W8P8wT0K8Fc0aZYh0z6HMNT1wZ9ckRqLKQTqRYrEY0c=s176-c-k-c0x00ffffff-no-rj' },
  { id: '6', name: 'IVE', followers: '15M', imageUrl: 'https://yt3.googleusercontent.com/fL-Yzq5J6F4G0F6G2bE3qNJMxNJCDTz0E3U5TqQZ0G3FqQpJ5m6bYsYGbQVJbCqQB8FYXQ=s176-c-k-c0x00ffffff-no-rj' },
];

export default function ExplorePage() {
  const [country, setCountry] = useState('ZZ');

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Explore</h1>
          <p className="text-zinc-400">Discover trending music from around the world</p>
        </div>

        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-zinc-400" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {COUNTRY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Songs */}
      <section className="bg-zinc-900 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <TrendingUp className="h-5 w-5 text-purple-400" />
          Top Songs
        </h2>
        <div className="space-y-2">
          {mockSongs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors group cursor-pointer"
            >
              <span className="w-6 text-center text-zinc-500 font-medium">
                {index + 1}
              </span>
              <div className="relative w-12 h-12 rounded overflow-hidden bg-zinc-800">
                <Image
                  src={song.imageUrl}
                  alt={song.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{song.title}</p>
                <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
              </div>
              <span className="text-sm text-zinc-500 hidden md:block">{song.plays}</span>
              <button className="p-2 rounded-full bg-purple-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-4 w-4" fill="white" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Top Artists */}
      <section className="bg-zinc-900 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <User className="h-5 w-5 text-purple-400" />
          Top Artists
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {mockArtists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artist/${artist.id}`}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-transparent group-hover:ring-purple-500 transition-all">
                <Image
                  src={artist.imageUrl}
                  alt={artist.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <p className="font-medium text-center text-sm truncate w-full">{artist.name}</p>
              <p className="text-xs text-zinc-500">{artist.followers}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Playlists */}
      <section className="bg-zinc-900 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
          <Music2 className="h-5 w-5 text-purple-400" />
          Featured Playlists
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['K-Pop Hits', 'Chill Vibes', 'Workout Mix', 'Study Focus'].map((playlist, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-500 cursor-pointer group"
            >
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="font-bold text-lg">{playlist}</p>
                <p className="text-sm text-white/70">Curated by VibeStation</p>
              </div>
              <button className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <Heart className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Coming Soon */}
      <div className="text-center py-8 text-zinc-500">
        <p>Live data integration coming soon!</p>
        <p className="text-sm">Connect to YouTube Music API for real-time charts.</p>
      </div>
    </div>
  );
}
