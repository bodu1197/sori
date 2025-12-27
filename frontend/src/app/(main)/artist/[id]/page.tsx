'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Play, ArrowLeft, Users, Music, Video, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';

interface ArtistSong {
  videoId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  album?: { name: string; id?: string };
}

interface ArtistAlbum {
  browseId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  year?: string;
  type?: string;
}

interface ArtistVideo {
  videoId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  views?: string;
}

interface RelatedArtist {
  browseId?: string;
  title: string;
  thumbnails?: Array<{ url: string }>;
  subscribers?: string;
}

interface ArtistData {
  name?: string;
  description?: string;
  thumbnails?: Array<{ url: string }>;
  subscribers?: string;
  views?: string;
  monthlyListeners?: string;
  songs?: { results?: ArtistSong[] };
  albums?: { results?: ArtistAlbum[]; browseId?: string };
  singles?: { results?: ArtistAlbum[]; browseId?: string };
  videos?: { results?: ArtistVideo[]; browseId?: string };
  related?: { results?: RelatedArtist[]; browseId?: string };
}

export default function ArtistPage() {
  const params = useParams();
  const artistId = params.id as string;
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (artistId) {
      api.getArtist(artistId).then((data) => {
        if (data.success) setArtist(data.data);
        setLoading(false);
      });
    }
  }, [artistId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Artist not found</p>
      </div>
    );
  }

  const thumbnail = artist.thumbnails?.[artist.thumbnails.length - 1]?.url || '';
  const songs = artist.songs?.results || [];
  const albums = artist.albums?.results || [];
  const singles = artist.singles?.results || [];
  const videos = artist.videos?.results || [];
  const related = artist.related?.results || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <Link href="/" className="absolute top-0 left-0 p-2 hover:bg-zinc-800/50 rounded-full transition-colors z-10">
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-8 md:pt-0">
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
            {thumbnail && (
              <img src={thumbnail} alt={artist.name} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-zinc-400 mb-1">Artist</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-2">{artist.name}</h1>
            {artist.subscribers && (
              <p className="flex items-center justify-center md:justify-start gap-2 text-zinc-400">
                <Users className="h-4 w-4" />
                {artist.subscribers}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {artist.description && (
        <p className="text-zinc-400 max-w-3xl">{artist.description}</p>
      )}

      {/* Top Songs */}
      {songs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-400" />
            Top Songs
          </h2>
          <div className="space-y-2">
            {songs.slice(0, 10).map((song, i) => (
              <Link
                key={i}
                href={song.videoId ? `/watch/${song.videoId}` : '#'}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <span className="w-6 text-center text-zinc-500">{i + 1}</span>
                <div className="w-12 h-12 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                  {song.thumbnails?.[0]?.url && (
                    <img src={song.thumbnails[0].url} alt={song.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{song.title}</p>
                  {song.album?.name && (
                    <p className="text-sm text-zinc-400 truncate">{song.album.name}</p>
                  )}
                </div>
                <Play className="h-5 w-5 text-zinc-500 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.slice(0, 12).map((album, i) => (
              <Link
                key={i}
                href={album.browseId ? `/album/${album.browseId}` : '#'}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2 relative">
                  {album.thumbnails?.[0]?.url && (
                    <img
                      src={album.thumbnails[0].url}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-10 w-10 text-white" fill="white" />
                  </div>
                </div>
                <p className="font-medium text-sm truncate">{album.title}</p>
                {album.year && <p className="text-xs text-zinc-400">{album.year}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Singles */}
      {singles.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Singles & EPs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {singles.slice(0, 12).map((single, i) => (
              <Link
                key={i}
                href={single.browseId ? `/album/${single.browseId}` : '#'}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800 mb-2 relative">
                  {single.thumbnails?.[0]?.url && (
                    <img
                      src={single.thumbnails[0].url}
                      alt={single.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-10 w-10 text-white" fill="white" />
                  </div>
                </div>
                <p className="font-medium text-sm truncate">{single.title}</p>
                {single.year && <p className="text-xs text-zinc-400">{single.year}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-purple-400" />
            Videos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.slice(0, 6).map((video, i) => (
              <Link
                key={i}
                href={video.videoId ? `/watch/${video.videoId}` : '#'}
                className="group"
              >
                <div className="aspect-video rounded-lg overflow-hidden bg-zinc-800 mb-2 relative">
                  {video.thumbnails?.[0]?.url && (
                    <img
                      src={video.thumbnails[0].url}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-12 w-12 text-white" fill="white" />
                  </div>
                </div>
                <p className="font-medium text-sm truncate">{video.title}</p>
                {video.views && <p className="text-xs text-zinc-400">{video.views} views</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related Artists */}
      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-400" />
            Fans Also Like
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {related.slice(0, 12).map((artist, i) => (
              <Link
                key={i}
                href={artist.browseId ? `/artist/${artist.browseId}` : '#'}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-transparent group-hover:ring-purple-500 transition-all">
                  {artist.thumbnails?.[0]?.url && (
                    <img
                      src={artist.thumbnails[0].url}
                      alt={artist.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <p className="font-medium text-sm text-center truncate w-full">{artist.title}</p>
                {artist.subscribers && (
                  <p className="text-xs text-zinc-500">{artist.subscribers}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
