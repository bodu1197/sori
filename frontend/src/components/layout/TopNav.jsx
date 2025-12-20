import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';

export default function TopNav() {
  return (
    <header className="h-[44px] bg-white dark:bg-black px-4 flex justify-between items-center sticky top-0 z-40">
      {/* Logo Area */}
      <div className="flex items-center">
        {/* Using text for now, pretend it's the Instagram script logo */}
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'cursive' }}>
          MusicGram
        </h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-5">
        <button className="relative hover:opacity-70 transition-opacity">
          <Heart size={26} strokeWidth={2} className="text-black dark:text-white" />
          <span className="absolute -top-1 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-black">
            2
          </span>
        </button>
        <button className="relative hover:opacity-70 transition-opacity">
          <MessageCircle size={26} strokeWidth={2} className="text-black dark:text-white" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-black">
            5
          </span>
        </button>
      </div>
    </header>
  );
}
