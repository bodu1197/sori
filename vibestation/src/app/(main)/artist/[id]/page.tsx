'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Shuffle, UserPlus, Music2, ArrowLeft, Loader2 } from 'lucide-react';

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

interface Song {
  videoId: string;
  title: string;
  album?: { name: string };
  thumbnails?: Array<{ url: string }>;
  duration?: string;
  views?: string;
}

interface Album {
  browseId: string;
  title: string;
  year?: string;
  thumbnails?: Array<{ url: string }>;
}

interface ArtistData {
  name: string;
  description?: string;
  subscribers?: string;
  views?: string;
  thumbnails?: Array<{ url: string; width: number; height: number }>;
  songs?: { results: Song[] };
  albums?: { results: Album[] };
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const { id } = use(params);
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArtist() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/music/artist?id=${encodeURIComponent(id)}`);
        const data = await res.json();

        if (data.success) {
          setArtist(data.data);
        } else {
          setError(data.error || 'Failed to load artist');
        }
      } catch (err) {
        setError('Failed to connect to server');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchArtist();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="max-w-6xl mx-auto py-4">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="text-center py-20">
          <p className="text-red-400">{error || 'Artist not found'}</p>
          <Link
            href="/explore"
            className="mt-4 inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            Go to Explore
          </Link>
        </div>
      </div>
    );
  }

  const thumbnail = artist.thumbnails?.[artist.thumbnails.length - 1]?.url || '';
  const songs = artist.songs?.results || [];
  const albums = artist.albums?.results || [];

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
        <div className="h-48 w-48 rounded-full overflow-hidden bg-zinc-800 shrink-0 ring-4 ring-purple-500/20">
          {thumbnail && (
            <img
              src={thumbnail}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold">{artist.name}</h1>
          {artist.subscribers && (
            <p className="text-zinc-400">{artist.subscribers}</p>
          )}
          {artist.views && (
            <p className="text-sm text-zinc-500">{artist.views} views</p>
          )}
          {artist.description && (
            <p className="text-sm text-zinc-500 mt-2 max-w-2xl line-clamp-3">
              {artist.description}
            </p>
          )}
          <div className="flex gap-3 mt-4 justify-center md:justify-start">
            <button
              onClick={() => alert('Play All feature coming soon!')}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors"
            >
              <Play className="h-4 w-4" fill="white" />
              Play All
            </button>
            <button
              onClick={() => alert('Shuffle feature coming soon!')}
              className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium transition-colors"
            >
              <Shuffle className="h-4 w-4" />
              Shuffle
            </button>
            <button
              onClick={() => alert('Follow feature coming soon!')}
              className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Follow
            </button>
          </div>
        </div>
      </div>

      {/* Top Songs */}
      {songs.length > 0 && (
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
            <Music2 className="h-5 w-5 text-purple-400" />
            Top Songs
          </h2>
          <div className="space-y-2">
            {songs.slice(0, 10).map((song, index) => {
              const songThumb = song.thumbnails?.[0]?.url || '';

              return (
                <div
                  key={song.videoId || index}
                  onClick={() => song.videoId && window.open(`https://music.youtube.com/watch?v=${song.videoId}`, '_blank')}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span className="w-6 text-center text-zinc-500 font-medium">
                    {index + 1}
                  </span>
                  <div className="w-12 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                    {songThumb ? (
                      <img
                        src={songThumb}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                        <Music2 className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    {song.album?.name && (
                      <p className="text-sm text-zinc-400 truncate">{song.album.name}</p>
                    )}
                  </div>
                  {song.views && (
                    <span className="text-sm text-zinc-500 hidden md:block">{song.views}</span>
                  )}
                  {song.duration && (
                    <span className="text-sm text-zinc-500">{song.duration}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.slice(0, 12).map((album, index) => {
              const albumThumb = album.thumbnails?.[0]?.url || '';

              return (
                <div
                  key={album.browseId || index}
                  className="group cursor-pointer"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2">
                    {albumThumb ? (
                      <img
                        src={albumThumb}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                        <Music2 className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{album.title}</p>
                  {album.year && (
                    <p className="text-xs text-zinc-500">{album.year}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
