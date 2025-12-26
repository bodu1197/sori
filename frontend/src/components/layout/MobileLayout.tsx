import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import BottomNav from './BottomNav';
import TopNav from './TopNav';
import MiniPlayer from '../player/MiniPlayer';
import YouTubePlayer from '../player/YouTubePlayer';
import TrackListPanel from '../player/TrackListPanel';
import usePlayerStore from '../../stores/usePlayerStore';
import { secureShuffle } from '../../lib/shuffle';

export default function MobileLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [pathname]);

  const {
    trackPanelOpen,
    trackPanelPlaylist,
    trackPanelLoading,
    closeTrackPanel,
    currentTrack,
    isPlaying,
    startPlayback,
  } = usePlayerStore();

  const handlePlayTrack = (
    track: { videoId: string; title: string; artists?: Array<{ name: string }>; duration?: string },
    index: number,
    allTracks: Array<{
      videoId: string;
      title: string;
      artists?: Array<{ name: string }>;
      duration?: string;
    }>
  ) => {
    const tracks = allTracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
      duration: t.duration,
    }));
    startPlayback(tracks, index);
  };

  const handlePlayAll = () => {
    if (trackPanelPlaylist?.tracks) {
      const tracks = trackPanelPlaylist.tracks.map((t) => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
        duration: t.duration,
      }));
      startPlayback(tracks, 0);
    }
  };

  const handleShuffleAll = () => {
    if (trackPanelPlaylist?.tracks) {
      const tracks = trackPanelPlaylist.tracks.map((t) => ({
        videoId: t.videoId,
        title: t.title,
        artist: t.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
        duration: t.duration,
      }));
      const shuffled = secureShuffle(tracks);
      startPlayback(shuffled, 0);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black flex justify-center items-center font-sans">
      {/* Hidden YouTube IFrame Player */}
      <YouTubePlayer />

      <div className="w-full max-w-[470px] h-[100dvh] bg-white dark:bg-black relative shadow-2xl overflow-hidden flex flex-col border-x border-gray-200 dark:border-gray-800">
        <TopNav />

        <main
          ref={mainRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative scrollbar-hide bg-white dark:bg-black text-black dark:text-white"
        >
          <Outlet />
        </main>

        <MiniPlayer />

        <BottomNav />

        {/* Global Track List Panel */}
        <TrackListPanel
          isOpen={trackPanelOpen}
          onClose={closeTrackPanel}
          playlist={trackPanelPlaylist}
          loading={trackPanelLoading}
          onPlayTrack={handlePlayTrack}
          onPlayAll={handlePlayAll}
          onShuffleAll={handleShuffleAll}
          currentVideoId={currentTrack?.videoId}
          isPlaying={isPlaying}
        />
      </div>
    </div>
  );
}
