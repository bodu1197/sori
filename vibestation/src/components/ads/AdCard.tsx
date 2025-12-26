'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Ad } from '@/lib/api/ads';
import { adsApi } from '@/lib/api/ads';

interface AdCardProps {
  ad: Ad;
}

export function AdCard({ ad }: AdCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionRecorded = useRef(false);

  // Record impression when ad becomes visible
  useEffect(() => {
    if (!cardRef.current || impressionRecorded.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !impressionRecorded.current) {
          impressionRecorded.current = true;
          adsApi.recordImpression(ad.id).catch(console.error);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [ad.id]);

  const handleClick = () => {
    adsApi.recordClick(ad.id).catch(console.error);
  };

  const advertiserName = ad.advertiser?.company_name || ad.advertiser?.user?.username || 'Advertiser';
  const avatarUrl = ad.advertiser?.user?.avatar_url;

  return (
    <Card ref={cardRef} className="overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl || undefined} alt={advertiserName} />
          <AvatarFallback>{advertiserName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{advertiserName}</span>
            <Badge variant="secondary" className="text-xs">
              Sponsored
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{ad.title}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Hide this ad</DropdownMenuItem>
            <DropdownMenuItem>Report ad</DropdownMenuItem>
            <DropdownMenuItem>Why am I seeing this?</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Media */}
      {ad.media_urls && ad.media_urls.length > 0 && (
        <div className="relative aspect-square bg-muted">
          {ad.type === 'video' ? (
            <video
              src={ad.media_urls[0]}
              className="w-full h-full object-cover"
              controls
              muted
              playsInline
            />
          ) : ad.type === 'carousel' && ad.media_urls.length > 1 ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory">
              {ad.media_urls.map((url, i) => (
                <div key={i} className="flex-shrink-0 w-full snap-center">
                  <Image
                    src={url}
                    alt={`${ad.title} - Image ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <Image
              src={ad.media_urls[0]}
              alt={ad.title}
              fill
              className="object-cover"
            />
          )}
        </div>
      )}

      {/* Content */}
      {ad.content && (
        <CardContent className="p-4">
          <p className="text-sm">{ad.content}</p>
        </CardContent>
      )}

      {/* CTA Button */}
      <CardFooter className="p-4 pt-0">
        <Link
          href={ad.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="w-full"
        >
          <Button className="w-full" variant="default">
            {ad.cta_text}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
