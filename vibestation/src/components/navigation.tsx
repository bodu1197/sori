'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Compass, BarChart3, Music, Mic2, LogIn, Clapperboard, Video } from 'lucide-react';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/charts', icon: BarChart3, label: 'Charts' },
  { href: '/shorts', icon: Clapperboard, label: 'Shorts' },
  { href: '/videos', icon: Video, label: 'Videos' },
  { href: '/moods', icon: Music, label: 'Moods' },
  { href: '/podcasts', icon: Mic2, label: 'Podcasts' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 flex-col p-4">
        <Link href="/" className="text-2xl font-bold text-purple-400 mb-8">
          VibeStation
        </Link>

        <div className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/login"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LogIn className="h-5 w-5" />
          <span>Login</span>
        </Link>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 ${
                  isActive ? 'text-purple-400' : 'text-zinc-500'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
