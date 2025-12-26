'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, ListMusic, FileText, SkipBack, SkipForward } from 'lucide-react';
import { api } from '@/lib/api';

interface WatchTrack {
  videoId?: string;
  title: string;
  artists?: Array<{ name: string; id?: string }>;
  thumbnails?: Array<{ url: string }>;
  length?: string;
}

interface SongData {
  videoDetails?: {
    videoId: string;
    title: string;
    author: string;
    channelId?: string;
    lengthSeconds?: string;
    thumbnail?: { thumbnails?: Array<{ url: string }> };
  };
}

interface LyricsData {
  lyrics?: string;
  source?: string;
}

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [song, setSong] = useState<SongData | null>(null);
  const [watchPlaylist, setWatchPlaylist] = useState<WatchTrack[]>([]);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [lyricsId, setLyricsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (videoId) {
      setLoading(true);
      setShowLyrics(false);
      setLyrics(null);

      // Get song details and watch playlist
      Promise.all([
        api.getSong(videoId),
        api.getWatch(videoId),
      ]).then(([songData, watchData]) => {
        if (songData.success) {
          setSong(songData.data);
          // Get lyrics browse id from watch data
          if (watchData.data?.lyrics) {
            setLyricsId(watchData.data.lyrics);
          }
        }
        if (watchData.success) {
          const tracks = watchData.data?.tracks || [];
          setWatchPlaylist(tracks);
          // Find current song index
          const idx = tracks.findIndex((t: WatchTrack) => t.videoId === videoId);
          setCurrentIndex(idx >= 0 ? idx : 0);
        }
        setLoading(false);
      });
    }
  }, [videoId]);

  const loadLyrics = async () => {
    if (lyricsId && !lyrics) {
      const data = await api.getLyrics(lyricsId);
      if (data.success) {
        setLyrics(data.data);
      }
    }
    setShowLyrics(!showLyrics);
  };

  const playPrev = () => {
    if (currentIndex > 0 && watchPlaylist[currentIndex - 1]?.videoId) {
      router.push(`/watch/${watchPlaylist[currentIndex - 1].videoId}`);
    }
  };

  const playNext = () => {
    if (currentIndex < watchPlaylist.length - 1 && watchPlaylist[currentIndex + 1]?.videoId) {
      router.push(`/watch/${watchPlaylist[currentIndex + 1].videoId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const title = song?.videoDetails?.title || '';
  const artist = song?.videoDetails?.author || '';
  const thumbnail = song?.videoDetails?.thumbnail?.thumbnails?.[song?.videoDetails?.thumbnail?.thumbnails.length - 1]?.url || '';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="h-5 w-5" />
        Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Player Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* YouTube Player */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          {/* Song Info & Controls */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{title}</h1>
              <p className="text-zinc-400">{artist}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={playPrev}
                disabled={currentIndex <= 0}
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={playNext}
                disabled={currentIndex >= watchPlaylist.length - 1}
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="h-5 w-5" />
              </button>
              {lyricsId && (
                <button
                  onClick={loadLyrics}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                    showLyrics ? 'bg-purple-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Lyrics
                </button>
              )}
            </div>
          </div>

          {/* Lyrics */}
          {showLyrics && (
            <div className="bg-zinc-900 rounded-xl p-6">
              <h3 className="font-bold mb-4">Lyrics</h3>
              {lyrics?.lyrics ? (
                <pre className="whitespace-pre-wrap text-zinc-300 font-sans text-sm leading-relaxed">
                  {lyrics.lyrics}
                </pre>
              ) : (
                <p className="text-zinc-500">No lyrics available</p>
              )}
              {lyrics?.source && (
                <p className="text-xs text-zinc-500 mt-4">Source: {lyrics.source}</p>
              )}
            </div>
          )}
        </div>

        {/* Up Next / Playlist */}
        <div className="bg-zinc-900 rounded-xl p-4 h-fit max-h-[80vh] overflow-y-auto">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-purple-400" />
            Up Next
          </h3>
          <div className="space-y-2">
            {watchPlaylist.map((track, i) => (
              <Link
                key={i}
                href={track.videoId ? `/watch/${track.videoId}` : '#'}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  track.videoId === videoId
                    ? 'bg-purple-600/20 border border-purple-500/30'
                    : 'hover:bg-zinc-800'
                }`}
              >
                <div className="w-10 h-10 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                  {track.thumbnails?.[0]?.url && (
                    <img
                      src={track.thumbnails[0].url}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {track.artists?.map((a) => a.name).join(', ')}
                  </p>
                </div>
                {track.length && (
                  <span className="text-xs text-zinc-500">{track.length}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
