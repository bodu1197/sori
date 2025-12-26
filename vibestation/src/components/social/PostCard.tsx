'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import type { Post } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useLikePost } from '@/hooks/useSocial';
import { usePlayerStore } from '@/stores/usePlayerStore';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Play,
  Star,
  BadgeCheck,
} from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isSaved, setIsSaved] = useState(post.is_saved || false);

  const likeMutation = useLikePost();
  const setTrack = usePlayerStore((state) => state.setTrack);

  const handleLike = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));
    likeMutation.mutate({ postId: post.id, liked: isLiked });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement save mutation
  };

  const handlePlayMusic = () => {
    if (post.music_data && 'videoId' in post.music_data && post.music_data.videoId) {
      setTrack({
        videoId: post.music_data.videoId,
        title: post.music_data.title,
        artists: [{ name: 'artists' in post.music_data ? post.music_data.artists[0]?.name || '' : '', id: '' }],
        thumbnail: post.music_data.thumbnail || '',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <Link href={`/@${post.user.username}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.user.avatar_url} alt={post.user.display_name} />
            <AvatarFallback>{post.user.display_name[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/@${post.user.username}`} className="font-semibold hover:underline">
            {post.user.display_name}
          </Link>
          {post.artist && (
            <span className="text-sm text-muted-foreground">
              {' '}
              &bull; about{' '}
              <Link href={`/artist/${post.artist.id}`} className="text-primary hover:underline">
                {post.artist.name}
              </Link>
            </span>
          )}
          <p className="text-xs text-muted-foreground">
            @{post.user.username} &bull;{' '}
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        {post.is_ad && (
          <span className="text-xs bg-muted px-2 py-1 rounded">Sponsored</span>
        )}
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Content */}
        <p className="whitespace-pre-wrap">{post.content}</p>

        {/* Rating (for review posts) */}
        {post.type === 'review' && post.rating && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${i < post.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            ))}
            <span className="ml-2 text-sm font-medium">{post.rating}/5</span>
          </div>
        )}

        {/* Music Data */}
        {post.music_data && 'videoId' in post.music_data && (
          <div
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
            onClick={handlePlayMusic}
          >
            <div className="relative h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
              {post.music_data.thumbnail && (
                <Image
                  src={post.music_data.thumbnail}
                  alt={post.music_data.title}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-5 w-5 text-white fill-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{post.music_data.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {'artists' in post.music_data ? post.music_data.artists[0]?.name : ''}
              </p>
            </div>
          </div>
        )}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`grid gap-2 ${post.media_urls.length > 1 ? 'grid-cols-2' : ''}`}>
            {post.media_urls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <Image src={url} alt="" fill className="object-cover" />
                {i === 3 && post.media_urls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      +{post.media_urls.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isLiked ? 'text-red-500' : ''}`}
            onClick={handleLike}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likesCount > 0 ? likesCount : ''}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-5 w-5" />
            <span>{post.comments_count > 0 ? post.comments_count : ''}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Share2 className="h-5 w-5" />
            <span>{post.shares_count > 0 ? post.shares_count : ''}</span>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={isSaved ? 'text-primary' : ''}
          onClick={handleSave}
        >
          <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
        </Button>
      </CardFooter>
    </Card>
  );
}
