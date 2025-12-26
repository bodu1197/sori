'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCreatePost } from '@/hooks/useSocial';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Image as ImageIcon, Music2, Star, Send, X } from 'lucide-react';

interface PostComposerProps {
  onSuccess?: () => void;
}

export function PostComposer({ onSuccess }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'music' | 'review'>('text');
  const [rating, setRating] = useState(0);

  const user = useAuthStore((state) => state.user);
  const createPost = useCreatePost();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    try {
      await createPost.mutateAsync({
        type,
        content: content.trim(),
        rating: type === 'review' ? rating : undefined,
      });
      setContent('');
      setType('text');
      setRating(0);
      toast.success('Post created!');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create post');
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>Sign in to share your thoughts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || undefined} />
            <AvatarFallback>
              {user.display_name?.[0] || user.email?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0"
            />

            {/* Rating (for review type) */}
            {type === 'review' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rating:</span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <Button
            variant={type === 'text' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setType('text')}
          >
            Text
          </Button>
          <Button
            variant={type === 'music' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setType('music')}
          >
            <Music2 className="h-4 w-4 mr-1" />
            Music
          </Button>
          <Button
            variant={type === 'review' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setType('review')}
          >
            <Star className="h-4 w-4 mr-1" />
            Review
          </Button>
          <Button variant="ghost" size="sm">
            <ImageIcon className="h-4 w-4 mr-1" />
            Image
          </Button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || createPost.isPending}
          size="sm"
        >
          {createPost.isPending ? 'Posting...' : 'Post'}
          <Send className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
