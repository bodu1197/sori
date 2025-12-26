'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  BarChart3,
  Settings,
  Music2,
  DollarSign,
  Megaphone,
  Shield,
  ChevronLeft,
  Menu,
} from 'lucide-react';

const adminNavItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Content', href: '/admin/content', icon: FileText },
  { title: 'Reports', href: '/admin/reports', icon: Flag },
  { title: 'Artists', href: '/admin/artists', icon: Music2 },
  { title: 'Creators', href: '/admin/creators', icon: DollarSign },
  { title: 'Advertisers', href: '/admin/advertisers', icon: Megaphone },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { title: 'Moderation', href: '/admin/moderation', icon: Shield },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    // For now, we'll just check if user is logged in
    // In production, check user.role === 'admin' || 'superadmin'
    if (!user) {
      router.push('/login');
    } else {
      setIsLoading(false);
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <Link href="/admin" className="font-bold text-lg">
              Admin Panel
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <nav className="space-y-1 p-2">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'flex-1 overflow-auto transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}
