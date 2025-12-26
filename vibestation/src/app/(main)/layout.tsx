import { Navigation } from '@/components/navigation';
import YouTubePlayer from '@/components/YouTubePlayer';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <main className="pt-0 pb-32 md:pt-20 md:pb-24 px-4">
        {children}
      </main>
      <YouTubePlayer />
    </div>
  );
}
