import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import TopNav from './TopNav';
import MiniPlayer from '../player/MiniPlayer';

export default function MobileLayout() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black flex justify-center items-center font-sans">
      <div className="w-full max-w-[430px] h-[100dvh] bg-white dark:bg-black relative shadow-2xl overflow-hidden flex flex-col border-x border-gray-200 dark:border-gray-800">
        <TopNav />

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide bg-white dark:bg-black text-black dark:text-white">
          <Outlet />
        </main>

        <MiniPlayer />

        <BottomNav />
      </div>
    </div>
  );
}
