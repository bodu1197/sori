'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Music2, Users, FileText, RefreshCw, Plus, ExternalLink } from 'lucide-react';

// Placeholder data
const artists = [
  { id: '1', name: 'BTS', subscribers: '75M', posts: 1234, followers: 50000, verified: true },
  { id: '2', name: 'BLACKPINK', subscribers: '92M', posts: 890, followers: 45000, verified: true },
  { id: '3', name: 'NewJeans', subscribers: '15M', posts: 456, followers: 30000, verified: true },
  { id: '4', name: 'IVE', subscribers: '8M', posts: 234, followers: 20000, verified: false },
];

export default function ArtistsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Artists</h1>
          <p className="text-muted-foreground">Manage artist pages and virtual members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Artists
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Artist
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Music2 className="h-4 w-4" />
              Total Artists
            </div>
            <div className="text-2xl font-bold">{artists.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Followers
            </div>
            <div className="text-2xl font-bold">
              {(artists.reduce((sum, a) => sum + a.followers, 0) / 1000).toFixed(0)}K
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Total Posts
            </div>
            <div className="text-2xl font-bold">
              {artists.reduce((sum, a) => sum + a.posts, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-green-500">
              Verified Artists
            </div>
            <div className="text-2xl font-bold">
              {artists.filter((a) => a.verified).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Artist Directory</CardTitle>
          <CardDescription>All artists synced from YouTube Music</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist</TableHead>
                  <TableHead>YouTube Subscribers</TableHead>
                  <TableHead>Platform Followers</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artists.map((artist) => (
                  <TableRow key={artist.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`https://via.placeholder.com/40`} />
                          <AvatarFallback>{artist.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{artist.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{artist.subscribers}</TableCell>
                    <TableCell>{artist.followers.toLocaleString()}</TableCell>
                    <TableCell>{artist.posts.toLocaleString()}</TableCell>
                    <TableCell>
                      {artist.verified ? (
                        <Badge className="bg-blue-500">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
