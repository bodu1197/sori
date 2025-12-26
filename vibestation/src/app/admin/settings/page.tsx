'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Globe, DollarSign, Bell, Shield, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure platform settings and preferences</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="localization" className="gap-2">
            <Globe className="h-4 w-4" />
            Localization
          </TabsTrigger>
          <TabsTrigger value="monetization" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Monetization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>General platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input id="platform-name" defaultValue="VibeStation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" defaultValue="Your music, your community" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" defaultValue="A social platform for music lovers" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Disable access for non-admin users</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>New User Registration</Label>
                  <p className="text-sm text-muted-foreground">Allow new users to sign up</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="localization" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Localization Settings</CardTitle>
              <CardDescription>Language and region configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Default Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Supported Languages</Label>
                <p className="text-sm text-muted-foreground">76 languages configured</p>
                <Button variant="outline">Manage Languages</Button>
              </div>
              <div className="grid gap-2">
                <Label>Default Currency</Label>
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="krw">KRW (₩)</SelectItem>
                    <SelectItem value="jpy">JPY (¥)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monetization" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Creator Revenue Settings</CardTitle>
              <CardDescription>Configure creator payout settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Revenue Share (%)</Label>
                <Input type="number" defaultValue="70" />
                <p className="text-sm text-muted-foreground">Percentage of revenue shared with creators</p>
              </div>
              <div className="grid gap-2">
                <Label>Minimum Payout ($)</Label>
                <Input type="number" defaultValue="50" />
              </div>
              <div className="grid gap-2">
                <Label>Payout Schedule</Label>
                <Select defaultValue="monthly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advertising Settings</CardTitle>
              <CardDescription>Configure ad display settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Ads</Label>
                  <p className="text-sm text-muted-foreground">Show ads in user feeds</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="grid gap-2">
                <Label>Ad Frequency (posts)</Label>
                <Input type="number" defaultValue="5" />
                <p className="text-sm text-muted-foreground">Show ad every N posts</p>
              </div>
              <div className="grid gap-2">
                <Label>Minimum CPM ($)</Label>
                <Input type="number" defaultValue="2.50" step="0.01" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure system notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send email notifications to users</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send push notifications</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Admin Alerts</Label>
                  <p className="text-sm text-muted-foreground">Alert admins on critical events</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Platform security configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Rate Limiting</Label>
                  <p className="text-sm text-muted-foreground">Enable API rate limiting</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="grid gap-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" defaultValue="60" />
              </div>
              <div className="grid gap-2">
                <Label>Max Login Attempts</Label>
                <Input type="number" defaultValue="5" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Information</CardTitle>
              <CardDescription>Supabase database status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Project ID</Label>
                <p className="font-mono text-sm">nrtkbulkzhhlstaomvas</p>
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Region</Label>
                <p className="font-mono text-sm">ap-northeast-2</p>
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Status</Label>
                <p className="text-green-500 font-medium">Connected</p>
              </div>
              <div className="pt-4 flex gap-2">
                <Button variant="outline">Run Migrations</Button>
                <Button variant="outline">Clear Cache</Button>
                <Button variant="destructive">Reset Database</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button>Save All Settings</Button>
      </div>
    </div>
  );
}
