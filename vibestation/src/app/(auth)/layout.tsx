import { Music2 } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Music2 className="h-10 w-10 text-primary" />
        <span className="text-3xl font-bold">VibeStation</span>
      </Link>
      {children}
    </div>
  );
}
