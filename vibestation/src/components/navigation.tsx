'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/explore', label: 'Explore' },
  { href: '/search', label: 'Search' },
  { href: '/feed', label: 'Feed' },
  { href: '/profile', label: 'Profile' },
];

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

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
          <div className="flex items-center justify-around w-full md:w-auto md:gap-8">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center py-2 px-4 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'text-purple-400 bg-purple-400/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Auth Section - desktop only */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-zinc-700 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-full text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
