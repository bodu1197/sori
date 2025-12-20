import { Heart, MessageCircle } from 'lucide-react';

export default function TopNav(): JSX.Element {
  return (
    <header className="h-[44px] bg-white dark:bg-black px-4 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center">
        <h1
          className="text-2xl font-bold tracking-tight text-black dark:text-white"
          style={{ fontFamily: 'cursive' }}
        >
          MusicGram
        </h1>
      </div>

      <div className="flex items-center gap-5">
        <button className="relative hover:opacity-70 transition-opacity">
          <Heart size={26} strokeWidth={2} className="text-black dark:text-white" />
        </button>
        <button className="relative hover:opacity-70 transition-opacity">
          <MessageCircle size={26} strokeWidth={2} className="text-black dark:text-white" />
        </button>
      </div>
    </header>
  );
}
