import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import TopNav from './TopNav';
import MiniPlayer from '../player/MiniPlayer';
import usePlayerStore from '../../stores/usePlayerStore';

export default function MobileLayout() {
  const setTrack = usePlayerStore((state) => state.setTrack);

  useEffect(() => {
    // Demo Track Load
    setTrack({
      title: 'Super Shy',
      artist: 'NewJeans',
      cover: 'https://i.scdn.co/image/ab67616d0000b2733d98a0da7c77436da516152d',
    });
  }, [setTrack]);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black flex justify-center items-center font-sans">
      {/* Mobile Container wrapper */}
      <div className="w-full max-w-[430px] h-[100dvh] bg-white dark:bg-black relative shadow-2xl overflow-hidden flex flex-col border-x border-gray-200 dark:border-gray-800">
        {/* Top Navigation */}
        <TopNav />

        {/* Main Content Area (Scrollable) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide bg-white dark:bg-black">
          <Outlet />
        </main>

        {/* Global Mini Player */}
        <MiniPlayer />

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
