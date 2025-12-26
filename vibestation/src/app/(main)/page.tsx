import Link from 'next/link';
import { TrendingUp, Music, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="container py-6 space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          VibeStation
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Global Music Fandom SNS + YouTube Music Lite
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button size="lg" asChild>
            <Link href="/explore">Explore Music</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/feed">Join Community</Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <Music className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Free Music</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Stream millions of songs for free with YouTube Music integration.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Fan Community</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Connect with fans worldwide. Share posts, reviews, and moments.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <TrendingUp className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Earn Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Monetize your content. Earn from plays, tips, and subscriptions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Sparkles className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Fan Shop</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Buy and sell fan goods. Create your own shop and earn.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Charts Section Placeholder */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Trending Now</h2>
          <Button variant="ghost" asChild>
            <Link href="/explore">See All</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Placeholder cards */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted animate-pulse" />
              <CardContent className="p-3">
                <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Popular Artists Section Placeholder */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Popular Artists</h2>
          <Button variant="ghost" asChild>
            <Link href="/explore">See All</Link>
          </Button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex-shrink-0 text-center space-y-2">
              <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-20 mx-auto" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
