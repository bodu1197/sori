import React, { useEffect, useRef, useState } from 'react';
import { X, Heart, MessageCircle, Share2, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { AIChatDrawer } from '../ai/AIChatDrawer'; // Import Chat Component

interface ShortsPlayerProps {
  initialIndex: number;
  shorts: { videoId: string; title: string; artist: string; thumbnail: string }[];
  onClose: () => void;
}

export function ShortsPlayer({ initialIndex, shorts, onClose }: ShortsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Scroll to initial index on mount
  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current.children[initialIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'auto' });
    }
  }, [initialIndex]);

  // Observer for snap scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            setActiveIndex(index);
          }
        });
      },
      { threshold: 0.6 }
    );

    Array.from(container.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [shorts]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const activeVideo = shorts[activeIndex];

  return (
    // Outer Backdrop: Handles positioning and dimming for PC view
    <div className="fixed inset-0 z-[40] bg-black/90 backdrop-blur-sm flex justify-center items-start animate-in fade-in duration-300">
      {/* Search/App Width Container: Limits width on PC to match homepage frame */}
      <div className="w-full h-[100dvh] max-w-[480px] bg-black relative shadow-2xl overflow-hidden md:border-x md:border-gray-800">
        {/* Top Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-10 md:pt-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none sticky-header">
          <button
            onClick={onClose}
            className="text-white p-2 pointer-events-auto hover:bg-white/10 rounded-full transition backdrop-blur-md"
          >
            <ArrowLeft size={28} filter="drop-shadow(0 0 2px rgba(0,0,0,0.5))" />
          </button>
          <div className="font-bold text-white drop-shadow-md pt-2 text-lg">Shorts</div>
          <div className="w-10" />
        </div>

        {/* Snap Scroll Container */}
        <div
          ref={containerRef}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black no-scrollbar"
          style={{
            scrollSnapStop: 'always',
            overscrollBehaviorY: 'contain',
          }}
        >
          {shorts.map((video, index) => {
            const shouldLoad = Math.abs(activeIndex - index) <= 1;
            const isPlaying = activeIndex === index;

            return (
              <div
                key={video.videoId}
                data-index={index}
                className="h-full w-full snap-start relative flex items-center justify-center bg-black"
              >
                {/* Video Layer */}
                <div className="w-full h-full bg-gray-900 relative">
                  {shouldLoad ? (
                    isPlaying ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${video.videoId}&playsinline=1&enablejsapi=1&fs=0&iv_load_policy=3&disablekb=1`}
                        title={video.title}
                        className="w-full h-full object-cover pointer-events-auto"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      // Thumbnail
                      <div className="relative w-full h-full">
                        <img
                          src={
                            video.thumbnail ||
                            `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
                          }
                          className="w-full h-full object-cover opacity-60"
                          alt="thumbnail"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-full bg-black" />
                  )}
                </div>

                {/* Overlay UI */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Bottom Gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  {/* Right Action Bar */}
                  <div className="absolute right-4 bottom-24 flex flex-col gap-5 items-center pointer-events-auto pb-4">
                    <ActionButton
                      icon={<Heart size={28} className="fill-white/10" />}
                      label="Like"
                    />

                    {/* Chat Button */}
                    <ActionButton
                      icon={
                        <MessageCircle
                          size={28}
                          className={isChatOpen ? 'text-purple-400 fill-purple-400/20' : ''}
                        />
                      }
                      label="Chat"
                      onClick={() => setIsChatOpen(true)}
                    />

                    <ActionButton icon={<Share2 size={28} />} label="Share" />

                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 animate-spin-slow bg-gray-800 mt-2">
                      <img src={video.thumbnail} className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Bottom Info Area */}
                  <div className="absolute bottom-16 left-4 right-20 text-left pointer-events-auto">
                    <div className="flex items-center gap-2 mb-2 cursor-pointer hover:underline">
                      <div className="w-8 h-8 rounded-full bg-gray-700 border border-white/30 overflow-hidden">
                        <img
                          src={video.thumbnail}
                          className="w-full h-full object-cover scale-150 blur-sm"
                        />
                      </div>
                      <div>
                        <span className="text-white font-bold text-sm drop-shadow-md block">
                          @{video.artist}
                        </span>
                      </div>
                      <button className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full ml-1 hover:bg-red-700 transition shadow-lg">
                        Subscribe
                      </button>
                    </div>

                    <h3 className="text-white font-medium text-sm leading-snug line-clamp-2 drop-shadow-md mb-2 pr-2">
                      {video.title}
                    </h3>

                    <div className="flex items-center gap-2 text-white/90 text-xs bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <span className="animate-pulse">🎵</span>
                      <span className="scrolling-text-container max-w-[180px] overflow-hidden whitespace-nowrap text-ellipsis">
                        {video.artist} • Original Sound
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Drawer container constrained to width */}
        {isChatOpen && activeVideo && (
          <AIChatDrawer artistName={activeVideo.artist} onClose={() => setIsChatOpen(false)} />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // prevent other clicks
        onClick?.();
      }}
      className="flex flex-col items-center gap-1 group"
    >
      <div className="p-2.5 bg-gradient-to-br from-white/10 to-white/5 rounded-full text-white group-hover:bg-white/20 transition backdrop-blur-sm shadow-lg active:scale-95 border border-white/5">
        {icon}
      </div>
      {label && (
        <span className="text-[10px] text-white shadow-black drop-shadow-lg font-medium">
          {label}
        </span>
      )}
    </button>
  );
}
