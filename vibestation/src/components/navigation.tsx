'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Compass, User } from 'lucide-react';

const navItems = [
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - desktop only */}
          <Link href="/" className="hidden md:flex items-center gap-2 text-white font-bold text-xl">
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              VibeStation
            </span>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center justify-around w-full md:w-auto md:gap-6">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-3 md:px-4 rounded-lg transition-colors text-xs md:text-sm font-medium ${
                    isActive
                      ? 'text-purple-400'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Auth Section - desktop only */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
