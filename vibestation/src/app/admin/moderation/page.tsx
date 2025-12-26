'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, AlertTriangle, Ban, MessageSquare, Eye, CheckCircle, XCircle } from 'lucide-react';

// Placeholder data
const flaggedContent = [
  { id: '1', type: 'post', content: 'Inappropriate content...', reason: 'Auto-flagged: profanity', status: 'pending' },
  { id: '2', type: 'comment', content: 'Spam message...', reason: 'User report', status: 'pending' },
  { id: '3', type: 'post', content: 'Copyright content...', reason: 'DMCA claim', status: 'reviewing' },
];

const bannedWords = ['spam', 'scam', 'fake', 'click here'];

export default function ModerationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Moderation</h1>
        <p className="text-muted-foreground">Review and moderate platform content</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              Pending Review
            </div>
            <div className="text-2xl font-bold">{flaggedContent.filter(c => c.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Auto-flagged Today
            </div>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="h-4 w-4" />
              Approved Today
            </div>
            <div className="text-2xl font-bold">45</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-red-500">
              <Ban className="h-4 w-4" />
              Removed Today
            </div>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flagged">
        <TabsList>
          <TabsTrigger value="flagged">Flagged Content</TabsTrigger>
          <TabsTrigger value="automod">AutoMod Settings</TabsTrigger>
          <TabsTrigger value="banned">Banned Words</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Content Queue</CardTitle>
              <CardDescription>Content awaiting moderation review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Content Preview</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedContent.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.type === 'post' ? <MessageSquare className="h-3 w-3 mr-1" /> : null}
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.content}</TableCell>
                        <TableCell className="text-muted-foreground">{item.reason}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'pending' ? 'secondary' : 'outline'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-green-500">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automod" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>AutoMod Configuration</CardTitle>
              <CardDescription>Configure automatic content moderation rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Profanity Filter</p>
                  <p className="text-sm text-muted-foreground">Automatically flag posts containing profanity</p>
                </div>
                <Badge>Enabled</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Spam Detection</p>
                  <p className="text-sm text-muted-foreground">Detect and flag potential spam content</p>
                </div>
                <Badge>Enabled</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Link Scanning</p>
                  <p className="text-sm text-muted-foreground">Check links against known malicious URLs</p>
                </div>
                <Badge>Enabled</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Image Recognition</p>
                  <p className="text-sm text-muted-foreground">Scan images for inappropriate content</p>
                </div>
                <Badge variant="secondary">Disabled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banned" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Banned Words List</CardTitle>
              <CardDescription>Words and phrases that trigger automatic flagging</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {bannedWords.map((word) => (
                  <Badge key={word} variant="destructive" className="cursor-pointer">
                    {word}
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <Button variant="outline" size="sm">Add Word</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
