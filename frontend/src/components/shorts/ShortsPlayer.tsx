import React, { useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface ShortsPlayerProps {
  videoId: string;
  title: string;
  channelName: string;
  onClose: () => void;
}

export function ShortsPlayer({ videoId, title, channelName, onClose }: ShortsPlayerProps) {
  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-200">
      {/* Close Button - positioned for thumb reach */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-md"
      >
        <X size={24} />
      </button>

      {/* Video Container (Responsive, max width for mobile feel on desktop) */}
      <div className="relative w-full h-full md:w-[450px] md:h-[90vh] bg-black md:rounded-2xl overflow-hidden shadow-2xl">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&loop=1&playlist=${videoId}&playsinline=1&enablejsapi=1&fs=0`}
          title="Shorts"
          className="w-full h-full object-cover"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Overlay Infos (Bottom Gradient) */}
        {/* Note: YouTube iframe might cover this, but we try to overlay inputs with pointer-events-none for visuals */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24 pointer-events-none">
          <h3 className="text-white font-bold text-lg mb-1 line-clamp-2 drop-shadow-md">{title}</h3>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-gray-800" />
            </div>
            <span className="text-white font-medium text-sm drop-shadow-md">@{channelName}</span>
            <button className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full pointer-events-auto hover:bg-red-700 transition">
              Subscribe
            </button>
          </div>

          <div className="text-white/80 text-xs line-clamp-1 mb-4 flex items-center gap-1">
            <span>🎵</span>
            <span>Original Key - {title}</span>
          </div>
        </div>

        {/* Action Sidebar (Right) - TikTok Style */}
        <div className="absolute right-2 bottom-24 flex flex-col gap-6 items-center z-10 pointer-events-auto">
          <ActionButton
            icon={
              <Heart
                size={28}
                className="fill-transparent hover:fill-red-500 hover:text-red-500 transition-colors"
              />
            }
            label="Like"
          />
          <ActionButton icon={<MessageCircle size={28} />} label="Chat" />
          <ActionButton icon={<Share2 size={28} />} label="Share" />
          <ActionButton icon={<MoreHorizontal size={28} />} label="" />
        </div>
      </div>

      {/* Desktop Background Blur (Ambiance) */}
      <div
        className="absolute inset-0 -z-10 opacity-30 blur-3xl hidden md:block"
        style={{
          backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 group">
      <div className="p-3 bg-black/20 rounded-full text-white group-hover:bg-black/40 transition backdrop-blur-md border border-white/10 shadow-lg">
        {icon}
      </div>
      {label && (
        <span className="text-xs text-white shadow-black drop-shadow-md font-semibold">
          {label}
        </span>
      )}
    </button>
  );
}
