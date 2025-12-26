import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { I18nProvider } from '@/lib/i18n';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VibeStation - Global Music Fandom SNS',
  description:
    'Connect with music fans worldwide. Stream music, share posts, and earn from your content.',
  keywords: ['music', 'social', 'fandom', 'streaming', 'community'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
