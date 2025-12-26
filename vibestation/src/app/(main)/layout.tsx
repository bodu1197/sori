import { TopNav, BottomNav, MiniPlayer } from '@/components/layout';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pb-36 md:pb-24">{children}</main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
