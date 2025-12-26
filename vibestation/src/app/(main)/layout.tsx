import { Navigation } from '@/components/navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <main className="pt-0 pb-20 md:pt-20 md:pb-8 px-4">
        {children}
      </main>
    </div>
  );
}
