'use client';

import { use } from 'react';
import Link from 'next/link';
import { useProfile, useUserPosts, useFollowUser } from '@/hooks/useSocial';
import { useAuthStore } from '@/stores/useAuthStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/social/PostCard';
import { ArrowLeft, Settings, Grid, Bookmark, Heart, BadgeCheck } from 'lucide-react';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { username } = use(params);

  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile(username);
  const { data: posts, isLoading: postsLoading } = useUserPosts(profile?.id || '');
  const followMutation = useFollowUser();
  const currentUser = useAuthStore((state) => state.user);

  const isOwnProfile = currentUser?.id === profile?.id;

  const handleFollow = () => {
    if (profile) {
      followMutation.mutate({ userId: profile.id, following: false });
    }
  };

  if (profileLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">User not found</p>
            <p className="text-muted-foreground mb-4">@{username}</p>
            <Link href="/feed">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name} />
          <AvatarFallback className="text-2xl">{profile.display_name?.[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            {profile.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
          </div>
          <p className="text-muted-foreground">@{profile.username}</p>

          {profile.bio && <p className="mt-3">{profile.bio}</p>}

          <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 text-sm">
            <div>
              <span className="font-bold">{profile.following_count || 0}</span>{' '}
              <span className="text-muted-foreground">Following</span>
            </div>
            <div>
              <span className="font-bold">{profile.followers_count || 0}</span>{' '}
              <span className="text-muted-foreground">Followers</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4 justify-center sm:justify-start">
            {isOwnProfile ? (
              <Link href="/settings">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <>
                <Button onClick={handleFollow} disabled={followMutation.isPending}>
                  Follow
                </Button>
                <Button variant="outline">Message</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Posts Grid/List */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1 gap-2">
            <Grid className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="likes" className="flex-1 gap-2">
            <Heart className="h-4 w-4" />
            Likes
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 gap-2">
            <Bookmark className="h-4 w-4" />
            Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {postsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-4">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="likes" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Liked posts will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Saved posts will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
