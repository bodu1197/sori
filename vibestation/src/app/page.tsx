import Link from 'next/link';
import { Music, Users, ShoppingBag, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">VibeStation</h1>
        <div className="flex gap-4">
          <Link
            href="/explore"
            className="px-4 py-2 text-white hover:text-purple-200 transition"
          >
            Explore
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-white text-purple-900 rounded-full font-medium hover:bg-purple-100 transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Your Music.
            <br />
            <span className="text-purple-300">Your Community.</span>
          </h2>
          <p className="text-xl text-purple-200 mb-10 max-w-2xl mx-auto">
            Connect with fans worldwide. Discover new artists. Share your passion.
            The ultimate platform for music lovers.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-900 rounded-full text-lg font-semibold hover:bg-purple-100 transition"
          >
            <Zap className="h-5 w-5" />
            Start Exploring
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-6">
              <Music className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Free Music Streaming
            </h3>
            <p className="text-purple-200">
              Listen to millions of songs powered by YouTube Music. Create playlists and discover new tracks.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-6">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Fan Communities
            </h3>
            <p className="text-purple-200">
              Join artist fan clubs. Share posts, photos, and connect with fans who share your passion.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-6">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Fan Marketplace
            </h3>
            <p className="text-purple-200">
              Buy and sell fan merchandise. Open your own shop and reach fans worldwide.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-purple-300">
        <p>&copy; 2025 VibeStation. All rights reserved.</p>
      </footer>
    </div>
  );
}
