import Navigation from '@/components/Navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <Navigation />
      <main className="md:ml-64 pb-20 md:pb-8 p-4">
        {children}
      </main>
    </div>
  );
}
